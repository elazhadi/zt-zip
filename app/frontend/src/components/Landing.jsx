import logoSvg from '../assets/logo.svg'

export default function Landing({ onLogin }) {
  return (
    <div className="landing">
      <header className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-logo">
            <img src={logoSvg} alt="Gabarys" className="landing-logo-icon" />
            <span className="landing-logo-name">Gabarys</span>
          </div>
          <h1 className="landing-title">
            Débitage aluminium<br />
            <span className="landing-title-accent">simplifié et précis</span>
          </h1>
          <p className="landing-subtitle">
            Plateforme SaaS de gestion du débitage menuiserie aluminium.
            Calculs instantanés, multi-gammes, historique des chantiers,
            lecture de croquis par IA.
          </p>
          <button className="btn-hero" onClick={onLogin}>
            Se connecter
          </button>
        </div>
      </header>

      <section className="landing-features">
        <div className="landing-features-inner">
          <div className="feature-card">
            <span className="feature-icon">📐</span>
            <h3>Calcul instantané</h3>
            <p>
              Formules issues de l'abaque atelier. Débitage, mise en barre (FFD),
              vitrage et accessoires calculés en temps réel.
            </p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🏢</span>
            <h3>Multi-sites</h3>
            <p>
              Gérez plusieurs agences avec un historique des chantiers partagé.
              Chaque vendeur n'accède qu'à ses propres données.
            </p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">📷</span>
            <h3>Lecture photo</h3>
            <p>
              Photographiez un croquis manuscrit — l'IA pré-remplit
              le formulaire. Vous validez avant tout calcul.
            </p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">📦</span>
            <h3>Multi-gammes</h3>
            <p>
              ULYSSE 70 / PL600 inclus. D'autres gammes peuvent être ajoutées
              à la demande avec leur abaque atelier.
            </p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">📊</span>
            <h3>Exports PDF &amp; Excel</h3>
            <p>
              Génération de récapitulatifs complets à remettre
              au client ou à l'atelier de découpe.
            </p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🔒</span>
            <h3>Accès sécurisé</h3>
            <p>
              Chaque société dispose de son espace cloisonné.
              Rôles vendeur / responsable / admin avec session unique.
            </p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>Gabarys — plateforme réservée aux sociétés clientes.</p>
        <p>Pour demander un accès, contactez votre administrateur.</p>
      </footer>
    </div>
  )
}
