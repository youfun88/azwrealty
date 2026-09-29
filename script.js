// Azure Waves Realty — nav, scroll reveals, contact forms (FormSubmit, no backend)
(function () {
  var FORM_ENDPOINT = "https://formsubmit.co/ajax/contactusazw@gmail.com";
  var body = document.body;
  var header = document.querySelector(".site-header");

  // Header shadow once the page scrolls
  function onScroll() { header.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.querySelector(".nav");
  toggle.addEventListener("click", function () {
    var open = !body.classList.contains("nav-open");
    nav.style.top = header.getBoundingClientRect().bottom + "px";
    body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });

  // Services dropdown: click to toggle (hover handles desktop)
  document.querySelectorAll(".nav .dd > button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var dd = btn.parentElement;
      var open = !dd.classList.contains("open");
      dd.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", function (e) {
    if (window.innerWidth > 960 && !e.target.closest(".dd")) {
      document.querySelectorAll(".nav .dd.open").forEach(function (dd) { dd.classList.remove("open"); });
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      document.querySelectorAll(".nav .dd.open").forEach(function (dd) { dd.classList.remove("open"); });
    }
  });

  // Scroll reveals
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  // Forms
  document.querySelectorAll("form[data-form]").forEach(function (form) {
    var status = form.querySelector(".form-status");
    var btn = form.querySelector("button[type=submit]");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll("[required]").forEach(function (f) {
        var bad = !f.value.trim() || (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value));
        f.closest(".field").classList.toggle("invalid", bad);
        if (bad && ok) { f.focus(); ok = false; }
      });
      if (!ok) { show("err", "Please fill in the highlighted fields."); return; }

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (data._honey) return;
      data._subject = form.getAttribute("data-subject") + (data.name ? " — " + data.name : "");
      data._template = "table";
      data.page = document.title;

      var label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = "Sending…";
      fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.success === "false") throw j; }); })
        .then(function () {
          form.reset();
          show("ok", "Thank you! Your message has been sent. We'll be in touch within one business day.");
        })
        .catch(function () {
          show("err", "Sorry, something went wrong. Please call (858) 304-0136 or email contactusazw@gmail.com.");
        })
        .finally(function () { btn.disabled = false; btn.innerHTML = label; });
    });

    form.addEventListener("input", function (e) {
      var f = e.target.closest(".field");
      if (f) f.classList.remove("invalid");
    });

    function show(kind, msg) {
      status.className = "form-status " + kind;
      status.textContent = msg;
    }
  });

  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
