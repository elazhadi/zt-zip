/* SYPRAMED — interactions */
(function () {
  "use strict";

  // ---- Sticky nav shadow ----
  const nav = document.querySelector(".nav");
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- Mobile menu ----
  const burger = document.querySelector(".burger");
  const links = document.querySelector(".nav-links");
  if (burger && links) {
    burger.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("open");
        burger.classList.remove("open");
      })
    );
  }

  // ---- Scroll reveal ----
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 70 + "ms";
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  // ---- Animated counters ----
  const counters = document.querySelectorAll("[data-count]");
  const runCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    const dur = 1500;
    const start = performance.now();
    const suffix = el.dataset.suffix || "";
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.floor(eased * target);
      el.firstChild ? (el.childNodes[0].nodeValue = val.toLocaleString("fr-FR"))
                    : (el.textContent = val);
      if (p < 1) requestAnimationFrame(step);
      else el.childNodes[0].nodeValue = target.toLocaleString("fr-FR");
    };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window && counters.length) {
    const co = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            runCounter(e.target);
            co.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => co.observe(c));
  }

  // ---- Contact form : captcha + envoi e-mail ----
  // Destinataire des demandes
  const CONTACT_EMAIL = "Sypramed@gmail.com";
  // Clé d'accès Web3Forms (gratuite) — obtenez-la en 30 s sur https://web3forms.com
  // en saisissant l'adresse Sypramed@gmail.com, puis collez la clé ci-dessous.
  // Tant qu'elle reste "REPLACE_WITH_YOUR_ACCESS_KEY", l'envoi se fait via le
  // client mail du visiteur (mailto) en repli.
  const WEB3FORMS_KEY = "REPLACE_WITH_YOUR_ACCESS_KEY";

  const form = document.querySelector("#contact-form");
  if (form) {
    const okBox = form.querySelector(".form-success");
    const errBox = form.querySelector("#form-error");
    const capA = form.querySelector("#cap-a");
    const capB = form.querySelector("#cap-b");
    const capInput = form.querySelector("#captcha");
    const submitBtn = form.querySelector('button[type="submit"]');
    let answer = 0;

    const newCaptcha = () => {
      const a = Math.floor(Math.random() * 9) + 1;
      const b = Math.floor(Math.random() * 9) + 1;
      answer = a + b;
      if (capA) capA.textContent = a;
      if (capB) capB.textContent = b;
      if (capInput) capInput.value = "";
    };
    newCaptcha();

    const showErr = (msg) => {
      if (!errBox) return;
      errBox.textContent = "⚠ " + msg;
      errBox.classList.add("show");
      if (okBox) okBox.classList.remove("show");
    };

    const sendMailto = () => {
      const get = (n) => (form.querySelector("#" + n) || {}).value || "";
      const body =
        "Nom: " + get("nom") + "\n" +
        "Société: " + get("societe") + "\n" +
        "Email: " + get("email") + "\n" +
        "Téléphone: " + get("tel") + "\n" +
        "Sujet: " + get("sujet") + "\n\n" +
        get("message");
      window.location.href =
        "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent("[Site SYPRAMED] " + get("sujet") + " — " + get("nom")) +
        "&body=" + encodeURIComponent(body);
    };

    const succeed = () => {
      if (okBox) {
        okBox.classList.add("show");
        okBox.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (errBox) errBox.classList.remove("show");
      form.reset();
      newCaptcha();
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (errBox) errBox.classList.remove("show");

      // Honeypot : si rempli, c'est un robot
      const hp = form.querySelector("#botcheck");
      if (hp && hp.checked) return;

      // Champs requis
      if (!form.checkValidity()) {
        showErr("Merci de remplir tous les champs obligatoires.");
        form.reportValidity();
        return;
      }
      // Captcha
      if (parseInt(capInput.value, 10) !== answer) {
        showErr("Réponse anti-spam incorrecte. Merci de réessayer.");
        newCaptcha();
        capInput.focus();
        return;
      }

      // Pas de clé configurée -> repli mailto
      if (WEB3FORMS_KEY === "REPLACE_WITH_YOUR_ACCESS_KEY") {
        sendMailto();
        succeed();
        return;
      }

      // Envoi via Web3Forms
      const data = {
        access_key: WEB3FORMS_KEY,
        subject: "[Site SYPRAMED] Nouvelle demande de " + (form.querySelector("#nom") || {}).value,
        from_name: "Site SYPRAMED",
        nom: (form.querySelector("#nom") || {}).value,
        societe: (form.querySelector("#societe") || {}).value,
        email: (form.querySelector("#email") || {}).value,
        telephone: (form.querySelector("#tel") || {}).value,
        sujet: (form.querySelector("#sujet") || {}).value,
        message: (form.querySelector("#message") || {}).value
      };
      try {
        if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = ".65"; }
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data)
        });
        const out = await res.json();
        if (out.success) succeed();
        else showErr("L'envoi a échoué. Réessayez ou écrivez à " + CONTACT_EMAIL + ".");
      } catch (err) {
        showErr("Connexion impossible. Réessayez ou écrivez à " + CONTACT_EMAIL + ".");
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ""; }
      }
    });
  }

  // ---- Footer year ----
  const y = document.querySelector("#year");
  if (y) y.textContent = new Date().getFullYear();
})();
