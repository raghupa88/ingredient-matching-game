import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const toggle = () => i18n.changeLanguage(i18n.language === 'en' ? 'ta' : 'en');
  return (
    <button className="lang-switcher" onClick={toggle} aria-label="Switch language">
      {t('lang.switch')}
    </button>
  );
}
