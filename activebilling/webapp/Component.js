sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/core/Locale",
    "sap/ui/core/LocaleData",
    "sap/ui/model/resource/ResourceModel",
    "cnh/ab/activebilling/model/models"
], (UIComponent, Locale, LocaleData, ResourceModel, models) => {
    "use strict";

    return UIComponent.extend("cnh.ab.activebilling.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // Initialize i18n with language detection
            this._initI18n();

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // set the app model
            this.setModel(models.createAppModel(), "app");

            // set the filter model
            this.setModel(models.createFilterModel(), "filterModel");

            // set the history model
            this.setModel(models.createHistoryModel(), "historyModel");

            // set the role model
            this.setModel(models.createRoleModel(), "roleModel");

            // enable routing
            this.getRouter().initialize();
        },

        _initI18n() {
            // Get current locale from URL parameter or browser settings
            const sLocale = this._getLocaleFromUrl() || sap.ui.getCore().getConfiguration().getLanguage();
            
            // Set locale
            sap.ui.getCore().getConfiguration().setLanguage(sLocale);
            
            // Create i18n model
            const oI18nModel = new ResourceModel({
                bundleName: "cnh.ab.activebilling.i18n.i18n",
                locale: sLocale
            });
            
            this.setModel(oI18nModel, "i18n");
            
            // Store current locale for language switching
            this._sCurrentLocale = sLocale;
        },

        _getLocaleFromUrl() {
            const sUrlParams = new URLSearchParams(window.location.search);
            return sUrlParams.get('sap-ui-language') || sUrlParams.get('lang');
        },

        // Method to switch language programmatically
        switchLanguage(sLocale) {
            if (sLocale && sLocale !== this._sCurrentLocale) {
                // Update URL with new language
                const sCurrentUrl = new URL(window.location);
                sCurrentUrl.searchParams.set('sap-ui-language', sLocale);
                window.history.replaceState({}, '', sCurrentUrl);
                
                // Reload the page to apply new language
                window.location.reload();
            }
        },

        // Method to get available languages
        getAvailableLanguages() {
            return [
                { key: "en", text: "English" },
                { key: "it", text: "Italiano" },
                { key: "de", text: "Deutsch" },
                { key: "fr", text: "Français" }
            ];
        }
    });
});