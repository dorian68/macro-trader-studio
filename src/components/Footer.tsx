import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Footer() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  return (
    <footer className="bg-background border-t border-border py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img
                src="/footer_logo.png"
                alt="alphaLens.ai"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-muted-foreground text-sm">
              {t('footer.description')}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t('footer.product')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button
                  onClick={() => navigate("/features")}
                  className="hover:text-foreground transition-colors"
                >
                  {t('nav.features')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/pricing")}
                  className="hover:text-foreground transition-colors"
                >
                  {t('nav.pricing')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/contact")}
                  className="hover:text-foreground transition-colors"
                >
                  API
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t('footer.company')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button
                  onClick={() => navigate("/about")}
                  className="hover:text-foreground transition-colors"
                >
                  {t('nav.about')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/contact")}
                  className="hover:text-foreground transition-colors"
                >
                  {t('nav.contact')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/contact")}
                  className="hover:text-foreground transition-colors"
                >
                  {t('footer.privacy')}
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">{t('footer.support')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button
                  onClick={() => navigate("/contact")}
                  className="hover:text-foreground transition-colors"
                >
                  {t('nav.documentation')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/contact")}
                  className="hover:text-foreground transition-colors"
                >
                  {t('nav.helpCenter')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/contact")}
                  className="hover:text-foreground transition-colors"
                >
                  {t('footer.terms')}
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground text-sm">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
