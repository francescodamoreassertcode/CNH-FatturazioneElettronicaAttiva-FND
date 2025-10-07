/**
 * Global Service Configuration
 * Centralized configuration for all CAP service endpoints
 */
sap.ui.define([], () => {
    "use strict";

    return {
        // Base service URL
        baseUrl: "/http",
        
        // Available endpoints mapping (matching backend API methods)
        endpoints: {
            documentList: "getCAPDocumentList",
            patchDocumentList: "UpdateBKPF",
            documentHistory: "getCAPDocumentListHistory",
            pdfDownload: "EINV_GetInvoiceDocFromObjectStore",
            // Legacy endpoints - may need to be updated based on actual backend methods
            companyMaster: "getCAPMasterData", 
            invoiceCode: "getCAPInvoiceCode",
            taxCode: "getTaxCode",
            paymentMethods: "getPaymentMethods",
            fiscalRappList: "getFiscalRappList",
            fiscalRappData: "getFiscalRappData",
            tipidocExclude: "getTipidocExclude",
            sourceSystem: "getCAPSourceSystem",
            ackTag: "getAckTag",
            checkFields: "getCheckFields",
            tag: "getTag",
            unmis: "getUnmis",
            condType: "getCondType",
            text: "getText",
            invSender: "getInvSender",
            flowProg: "getFlowProg",
            structureFile: "getStructureFile",
            bankData: "getBankData",
            flowSched: "getFlowSched"
        },

        // Utility function to build service URLs with app module path
        getServiceUrl: function(endpoint, params, oController) {
            const entity = this.endpoints[endpoint] || endpoint;
            let url = `${this.baseUrl}/${entity}`;
            
            if (params) {
                const queryString = Object.keys(params)
                    .map(key => `${key}=${params[key]}`)
                    .join('&');
                url += `?${queryString}`;
            }
            
            // Add app module path for deployed environments
            try {
                let oComponent;
                if (oController) {
                    oComponent = oController.getOwnerComponent();
                } else {
                    // Fallback: try to get component from global context
                    const aComponents = sap.ui.core.Component.getComponents();
                    if (aComponents && aComponents.length > 0) {
                        oComponent = aComponents[0];
                    }
                }
                
                if (oComponent) {
                    const appId = oComponent.getManifestEntry("/sap.app/id");
                    const appPath = appId.replaceAll(".", "/");
                    const appModulePath = jQuery.sap.getModulePath(appPath);
                    url = appModulePath + url;
                }
            } catch (error) {
                // If we can't get the component, return URL without app path
                console.warn("Could not get app module path:", error);
            }
            
            return url;
        },

        // Utility function to get service root URL
        getServiceRootUrl: function() {
            return this.baseUrl + "/";
        },

        // Alternative paths to test (in case the main path is wrong)
        alternativePaths: [
            "/http/", 
            "/odata/v4/catalog/",
            "/odata/v4/catalg/",
            "/api/v4/catalog/"
        ]
    };
});
