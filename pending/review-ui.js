/* review-ui.js: shared by /pending and /pending/yufan. Loaded after the page's own review scripts.
   1. Highlights what changed in each BEFORE / AFTER pair (.ba.was + .ba.now) with <mark class="rv-d">.
   2. EN / 中文 switch: shows one language of the explanations and labels. Drafts (.ba, details.draft-lang,
      [data-draft], .links) always stay visible. Text is tagged with lang="en" / lang="zh-Hant"; old mixed
      text ("中文 English") is split into the two spans at load.
   3. Items at 需要修改 collapse into 「需要修改，處理中」 and approved items into 「已同意，等待上線」, below the waiting items.
   Sends nothing; the page's own scripts do all network requests. */
(function(){
  var D=document, H=D.documentElement;
  var HAN=/[㐀-鿿豈-﫿]/g, CJK=/[　-〿㐀-鿿豈-﫿＀-￯]/, CJKG=/[　-〿㐀-鿿豈-﫿＀-￯]/g;
  var KEEP='.rv-gate,script,style,textarea,code,pre,.ba,.links,[data-draft],.rv-draft,details.draft-lang>:not(summary),.rv-langbar,.rv-row';
  function q(s,r){return Array.prototype.slice.call((r||D).querySelectorAll(s));}
  function count(re,s){var m=s.match(re);return m?m.length:0;}
  function inKeep(n){var e=n.nodeType===1?n:n.parentElement;return !e||!!e.closest(KEEP);}
  function tagged(n){var e=n.nodeType===1?n:n.parentElement;var l=e&&e.closest('[lang]');return !!l&&l!==H;}

  /* ---------- 1. Before / after highlight ---------- */
  function tokens(s){return s.match(/[A-Za-z0-9]+(?:['’.,\-][A-Za-z0-9]+)*|\s+|[\s\S]/g)||[];}
  function texts(el){var out=[],w=D.createTreeWalker(el,NodeFilter.SHOW_TEXT,null);var n;
    while((n=w.nextNode())){var p=n.parentElement;if(p.closest('.ba>b:first-child'))continue;out.push(n);}return out;}
  function seq(el){var arr=[];texts(el).forEach(function(n){tokens(n.nodeValue).forEach(function(t){arr.push({t:t,n:n,ws:/^\s+$/.test(t),c:false});});});return arr;}
  function lcsMark(a,b){
    var A=a.filter(function(x){return !x.ws;}),B=b.filter(function(x){return !x.ws;}),n=A.length,m=B.length;
    if(!n||!m||n*m>4e6)return false;
    var w=m+1,T=new Uint16Array((n+1)*(m+1)),i,j;
    for(i=n-1;i>=0;i--)for(j=m-1;j>=0;j--)T[i*w+j]=A[i].t===B[j].t?T[(i+1)*w+j+1]+1:Math.max(T[(i+1)*w+j],T[i*w+j+1]);
    var L=T[0];if((n+m-2*L)/(n+m)>0.7)return false;
    A.forEach(function(x){x.c=true;});B.forEach(function(x){x.c=true;});
    i=0;j=0;while(i<n&&j<m){if(A[i].t===B[j].t){A[i].c=B[j].c=false;i++;j++;}else if(T[(i+1)*w+j]>=T[i*w+j+1])i++;else j++;}
    [A,B].forEach(function(S){ /* a lone common character or short word between two changes reads as noise: mark it too */
      for(var k=1;k<S.length-1;k++){if(S[k].c)continue;var e=k;while(e<S.length&&!S[e].c)e++;
        var run=S.slice(k,e),cjk=run.every(function(x){return CJK.test(x.t);});
        if(e<S.length&&S[k-1].c&&(cjk?run.length<=2:run.length===1&&run[0].t.length<=3))run.forEach(function(x){x.c=true;});k=e;}
    });
    return true;
  }
  function wrap(arr){
    var by=new Map();arr.forEach(function(x){if(!by.has(x.n))by.set(x.n,[]);by.get(x.n).push(x);});
    by.forEach(function(list,node){
      if(!list.some(function(x){return x.c;}))return;
      /* whitespace between two changed tokens joins the highlight */
      for(var k=1;k<list.length-1;k++)if(list[k].ws&&list[k-1].c&&list[k+1].c)list[k].c=true;
      var f=D.createDocumentFragment(),buf='',on=false;
      function flush(){if(!buf)return;if(on){var mk=D.createElement('mark');mk.className='rv-d';mk.textContent=buf;f.appendChild(mk);}else f.appendChild(D.createTextNode(buf));buf='';}
      list.forEach(function(x){if(x.c!==on){flush();on=x.c;}buf+=x.t;});flush();
      node.parentNode.replaceChild(f,node);
    });
  }
  function diffAll(){
    q('.ba.was').forEach(function(was){
      if(was.getAttribute('data-rv-diff'))return;
      var now=was.nextElementSibling;if(!now||!now.matches('.ba.now'))return;
      was.setAttribute('data-rv-diff','1');now.setAttribute('data-rv-diff','1');
      var a=seq(was),b=seq(now);if(lcsMark(a,b)){wrap(a);wrap(b);}
    });
  }

  /* ---------- 2. Language ---------- */
  var DICT={'您的名字 / Your name（選填 optional）':['您的名字（選填）',' / ','Your name (optional)']};
  function isBoundary(s,i){var k=i-1;while(k>=0&&/[…)）」』”"!！?？.。，,:：]/.test(s[k])&&!CJK.test(s[k]))k--;return k>=0&&CJK.test(s[k]);}
  function splitText(s){
    var t=s.trim();if(DICT[t]){var d=DICT[t],lead=s.slice(0,s.indexOf(t)),tail=s.slice(s.indexOf(t)+t.length);return [lead+d[0],d[1],d[2]+tail];}
    if(!count(HAN,s)||!/[A-Za-z]{2}/.test(s))return null;
    for(var pass=0;pass<2;pass++)for(var i=1;i<s.length;i++){
      if(!isBoundary(s,i))continue;
      var rest=s.slice(i),sep=rest.match(/^[\s·•|\/\-–—:：]*/)[0],en=rest.slice(sep.length);
      if(!/^[A-Za-z0-9"“'‘(\[$]/.test(en)||count(/[A-Za-z]/g,en)<4)continue;
      var cj=count(CJKG,en);
      if(pass===0?cj>0:(cj/en.length>0.1||en.split(/\s+/).length<6||!/^["“A-Z]/.test(en)))continue;
      var zh=s.slice(0,i);if(!count(HAN,zh))continue;
      return [zh,sep,en];
    }
    return null;
  }
  function span(lang,txt,cls){var e=D.createElement('span');e.setAttribute('lang',lang);e.className='rv-auto'+(cls?' '+cls:'');e.textContent=txt;return e;}
  function splitNode(n){
    if(!n.parentNode||inKeep(n)||tagged(n))return;
    var p=splitText(n.nodeValue);if(!p)return;
    var f=D.createDocumentFragment(),lead=p[0].match(/^\s*/)[0];
    if(lead){f.appendChild(D.createTextNode(lead));p[0]=p[0].slice(lead.length);}
    f.appendChild(span('zh-Hant',p[0]));
    if(p[1]){var s=D.createElement('span');s.className='rv-sep';s.textContent=p[1];f.appendChild(s);}
    f.appendChild(span('en',p[2]));
    n.parentNode.replaceChild(f,n);
  }
  function ownText(el){var s='';el.childNodes.forEach(function(c){if(c.nodeType===3)s+=c.nodeValue;else if(c.nodeType===1&&!c.hasAttribute('lang'))s+=ownText(c);});return s;}
  function langOf(s){var h=count(HAN,s),l=count(/[A-Za-z]/g,s);if(h&&h*3>=l)return 'zh-Hant';if(!h&&l>=4)return 'en';return '';}
  function other(l){return /^zh/.test(l)?'en':'zh-Hant';}
  function sib(n,dir){n=dir<0?n.previousSibling:n.nextSibling;while(n&&(n.nodeType===8||n.nodeType===3&&!n.nodeValue.trim()))n=dir<0?n.previousSibling:n.nextSibling;return n;}
  var BLOCK=/^(P|LI|H[1-6]|DT|DD)$/;
  function tagSiblings(root){
    q('[lang]',root).forEach(function(el){
      if(el===H||inKeep(el))return;var want=other(el.getAttribute('lang'));
      [-1,1].forEach(function(dir){
        var s=sib(el,dir);if(!s||inKeep(s))return;
        if(s.nodeType===3){if(!tagged(s)&&langOf(s.nodeValue)===want){var v=s.nodeValue,ld=v.match(/^\s*/)[0],e=span(want,v.slice(ld.length));if(ld)s.parentNode.insertBefore(D.createTextNode(ld),s);s.parentNode.replaceChild(e,s);}}
        else if(s.nodeType===1&&!s.hasAttribute('lang')&&(BLOCK.test(s.tagName)||s.tagName===el.tagName)&&!s.querySelector('.item,.links,.ba,form,button')&&langOf(ownText(s))===want){s.setAttribute('lang',want);s.classList.add('rv-auto');}
      });
    });
    /* two untagged paragraphs in a row, one Chinese, one English */
    q('p,li,h1,h2,h3,h4',root).forEach(function(el){
      if(el.hasAttribute('lang')||inKeep(el)||tagged(el))return;var nx=el.nextElementSibling;
      if(!nx||nx.tagName!==el.tagName||nx.hasAttribute('lang')||inKeep(nx))return;
      if(el.querySelector('[lang]')||nx.querySelector('[lang]'))return;
      var a=langOf(el.textContent),b=langOf(nx.textContent);
      if(a&&b&&a!==b){el.setAttribute('lang',a);nx.setAttribute('lang',b);el.classList.add('rv-auto');nx.classList.add('rv-auto');}
    });
  }
  function splitIn(root){
    if(root.nodeType===3){splitNode(root);return;}
    if(root.nodeType!==1||inKeep(root))return;
    var list=[],w=D.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),n;while((n=w.nextNode()))list.push(n);
    list.forEach(splitNode);
  }
  function labels(){
    q('.ba>b:first-child').forEach(function(b){
      if(b.querySelector('[lang]'))return;var t=b.textContent.trim(),zh={Before:'修改前',After:'修改後',BEFORE:'修改前',AFTER:'修改後'}[t];if(!zh)return;
      b.textContent='';b.appendChild(span('zh-Hant',zh,'rv-lbl'));b.appendChild(span('en',t,'rv-lbl'));
    });
  }
  function pickLang(){var s=null;try{s=localStorage.getItem('rv_lang');}catch(e){}
    if(s==='en'||s==='zh')return s;return /^en/i.test(navigator.language||'')?'en':'zh';}
  function setLang(l,save){
    H.classList.toggle('rv-lang-en',l==='en');H.classList.toggle('rv-lang-zh',l!=='en');
    q('.rv-lang button').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-l')===l));});
    if(save)try{localStorage.setItem('rv_lang',l);}catch(e){}
  }
  function langBar(){
    var hasEn=q('body [lang^="en"]').some(function(e){return !inKeep(e);}),hasZh=q('body [lang^="zh"]').some(function(e){return !inKeep(e);});
    if(!hasEn||!hasZh)return;
    var h1=q('h1').filter(function(h){return !h.closest('.rv-gate');})[0];if(!h1)return;
    var at=h1.previousElementSibling&&h1.previousElementSibling.classList.contains('eyebrow')?h1.previousElementSibling:h1;
    var bar=D.createElement('div');bar.className='rv-langbar';
    bar.innerHTML='<div class="rv-lang" role="group" aria-label="Language 語言"><button type="button" data-l="en" lang="en">EN</button><button type="button" data-l="zh" lang="zh-Hant">中文</button></div>';
    at.parentNode.insertBefore(bar,at);
    q('button',bar).forEach(function(b){b.addEventListener('click',function(){setLang(b.getAttribute('data-l'),true);});});
    labels();setLang(pickLang(),false);
  }

  /* ---------- 3. Changes-requested and approved sections ---------- */
  /* Order on the page: waiting items stay where they are, then 「需要修改，處理中」, then 「已同意，等待上線」.
     Items in the two lower sections collapse to one row; a click opens the full card. */
  var G={
    changes:{zh:'需要修改，處理中',en:'Changes requested, in progress',
      izh:'我們會依您的意見修改，改好後會回到上方等您審閱。',ien:'We\'ll revise it and bring it back up here for your review.',
      dzh:'需要修改 ',den:'Requested '},
    approved:{zh:'已同意，等待上線',en:'Approved, waiting to go live',
      izh:'這些已經同意，下次更新時上線。點一下可以展開，仍然可以留言或按「需要修改」。',ien:'These are approved and go live at the next update. Click one to open it; you can still comment or request changes.',
      dzh:'已同意 ',den:'Approved '}
  };
  var KINDS=['changes','approved'],groups={};
  function regular(box){var i=box.getAttribute('data-item');return i&&i!=='Suggestions'&&i!=='Questions'&&!box.classList.contains('suggest');}
  D.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.item .btns button[data-d]');
    if(b){var box=b.closest('.item');if(box){box.setAttribute('data-rv-sent',b.getAttribute('data-d'));box.removeAttribute('data-rv-undo');}}
    var u=e.target.closest&&e.target.closest('.rv-undo-btn');if(u){var bx=u.closest('.item');if(bx)bx.setAttribute('data-rv-undo','1');}
  },true);
  function state(box){
    var n=box.querySelector('.rv-received-note strong');
    if(n)return /^已同意/.test(n.textContent.trim())?'approved':'changes';
    var ok=box.querySelector('.form .status.ok'),sent=box.getAttribute('data-rv-sent');
    if(ok&&sent)return sent==='approve'?'approved':'changes';
    if(box.getAttribute('data-rv-undo'))return 'review';
    var s=box.getAttribute('data-status');return s==='approved'||s==='changes'?s:'review';
  }
  function today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
  function dateOf(box,s){
    if(box.querySelector('.form .status.ok')&&box.getAttribute('data-rv-sent'))return today();
    var n=box.querySelector('.rv-received-note strong'),t=n?n.textContent:'',m=s==='approved'?t.match(/已同意（([^）]+)）/):t.match(/已收到您\s*(\d{4}-\d\d-\d\d)/);
    if(m)return m[1];
    return box.getAttribute(s==='approved'?'data-approved':'data-requested')||'';
  }
  function makeSections(){
    var items=q('.item').filter(regular);if(!items.length)return;
    var at=items[items.length-1];
    KINDS.forEach(function(k){
      var g=G[k],s=D.createElement('section');s.className='rv-group rv-'+k;s.hidden=true;s.setAttribute('aria-labelledby','rvH-'+k);
      s.innerHTML='<h2 class="rv-group-h" id="rvH-'+k+'"><span lang="zh-Hant">'+g.zh+'</span><span class="rv-sep"> · </span><span lang="en">'+g.en+'</span> <span class="rv-n"></span></h2>'+
        '<p class="rv-group-intro"><span lang="zh-Hant">'+g.izh+'</span><span class="rv-sep"> </span><span lang="en">'+g.ien+'</span></p><div class="rv-list"></div>';
      at.parentNode.insertBefore(s,at.nextSibling);at=s;
      groups[k]={sec:s,list:s.querySelector('.rv-list'),n:s.querySelector('.rv-n')};
    });
  }
  function titleOf(box){
    var h=box.querySelector('h3,h2,summary'),en=box.querySelector('.en-title');
    var zh=(h?h.textContent:box.getAttribute('data-item')).trim();
    return {zh:zh,en:en?en.textContent.trim():''};
  }
  function addRow(box){
    var t=titleOf(box),r=D.createElement('button');r.type='button';r.className='rv-row';r.setAttribute('aria-expanded','false');
    var tt=D.createElement('span');tt.className='rv-t';
    if(t.en){tt.appendChild(span('zh-Hant',t.zh));tt.appendChild(span('en',t.en));}else tt.textContent=t.zh;
    var dt=D.createElement('span');dt.className='rv-date';
    r.innerHTML='<span class="rv-dot" aria-hidden="true"></span>';r.appendChild(tt);r.appendChild(dt);
    r.addEventListener('click',function(){var c=box.classList.toggle('rv-collapsed');r.setAttribute('aria-expanded',String(!c));});
    box.insertBefore(r,box.firstChild);
  }
  function rowDate(box,s){
    var r=box.querySelector(':scope>.rv-row .rv-date');if(!r)return;var d=dateOf(box,s),g=G[s],key=s+'|'+d;
    if(r.getAttribute('data-t')===key)return;r.setAttribute('data-t',key);r.textContent='';
    if(d){r.appendChild(span('zh-Hant',g.dzh+d));var p=D.createElement('span');p.className='rv-sep';p.textContent=' · ';r.appendChild(p);r.appendChild(span('en',g.den+d));}
  }
  function inGroup(box){return KINDS.some(function(k){return box.parentNode===groups[k].list;});}
  function place(){
    if(!groups.approved)return;var c={changes:0,approved:0};
    q('.item').filter(regular).forEach(function(box){
      /* a reply sent now replaces the one shown from before (the board keeps only the latest), so drop the old note */
      if(box.querySelector('.form .status.ok')&&box.getAttribute('data-rv-sent'))q('.rv-received-note',box).forEach(function(n){n.remove();});
      var s=state(box);
      /* a cancelled reply puts the item back to review on the board too; keep data-status (and the page's count chips) in step */
      if(s==='review'&&box.getAttribute('data-rv-undo')&&box.hasAttribute('data-status')&&box.getAttribute('data-status')!=='review'){
        box.setAttribute('data-status','review');box.classList.add('rv-undone');
      }
      if(groups[s]){
        c[s]++;var g=groups[s];
        if(box.parentNode!==g.list){
          if(!box._rvSlot){box._rvSlot=D.createComment('rv-slot');box.parentNode.insertBefore(box._rvSlot,box);}
          if(!box.querySelector(':scope>.rv-row'))addRow(box);
          box.classList.add('rv-collapsed');box.querySelector(':scope>.rv-row').setAttribute('aria-expanded','false');
          g.list.appendChild(box);
        }
        box.classList.toggle('rv-is-approved',s==='approved');box.classList.toggle('rv-is-changes',s==='changes');
        rowDate(box,s);
      }else if(inGroup(box)){
        box.classList.remove('rv-collapsed','rv-is-approved','rv-is-changes');
        var row=box.querySelector(':scope>.rv-row');if(row)row.remove();
        box._rvSlot.parentNode.insertBefore(box,box._rvSlot);
      }
    });
    KINDS.forEach(function(k){var g=groups[k];g.sec.hidden=!c[k];var v='('+c[k]+')';if(g.n.textContent!==v)g.n.textContent=v;});
    /* hide a section heading whose items have all moved down */
    q('h2').forEach(function(h){
      if(h.closest('.rv-group,.rv-gate'))return;var had=false,has=false,ex=[];
      for(var e=h.nextSibling;e&&!(e.nodeType===1&&(e.tagName==='H2'||e.classList.contains('rv-group')));e=e.nextSibling){
        if(e.nodeType===8&&e.nodeValue==='rv-slot')had=true;
        else if(e.nodeType===1){if(e.matches('.item'))has=true;else if(e.matches('.section-intro'))ex.push(e);}
      }
      var hide=had&&!has;h.classList.toggle('rv-empty',hide);ex.forEach(function(x){x.classList.toggle('rv-empty',hide);});
    });
  }

  /* ---------- run ---------- */
  diffAll();
  splitIn(D.body);tagSiblings(D.body);
  langBar();
  makeSections();place();
  var pending=[],busy=false;
  new MutationObserver(function(ms){
    ms.forEach(function(m){m.addedNodes.forEach(function(n){pending.push(n);});});
    if(busy)return;busy=true;
    Promise.resolve().then(function(){
      var list=pending;pending=[];
      list.forEach(function(n){if(n.isConnected){splitIn(n);if(n.nodeType===1)tagSiblings(n.parentNode||n);}});
      place();busy=false;
    });
  }).observe(D.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-status']});
})();
