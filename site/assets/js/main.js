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
  // Adresse de contact (aussi utilisée pour le repli mailto)
  const CONTACT_EMAIL = "contact@sypramed.ma";
  // Point d'envoi PHP hébergé au même endroit que le site (Genious).
  // Il envoie le message via le compte SMTP contact@sypramed.ma.
  // Si l'endpoint n'est pas joignable, le bouton ouvre le client mail (repli).
  const MAIL_ENDPOINT = "send.php";

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

      // Envoi via le point PHP (SMTP contact@sypramed.ma), repli mailto si indisponible
      try {
        if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = ".65"; }
        const res = await fetch(MAIL_ENDPOINT, { method: "POST", body: new FormData(form) });
        const out = await res.json();
        if (out && out.success) succeed();
        else showErr((out && out.message) || ("L'envoi a échoué. Réessayez ou écrivez à " + CONTACT_EMAIL + "."));
      } catch (err) {
        // Endpoint injoignable (pas encore en ligne, réseau…) -> repli client mail
        sendMailto();
        succeed();
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ""; }
      }
    });
  }

  // ---- Footer year ----
  const y = document.querySelector("#year");
  if (y) y.textContent = new Date().getFullYear();
})();
