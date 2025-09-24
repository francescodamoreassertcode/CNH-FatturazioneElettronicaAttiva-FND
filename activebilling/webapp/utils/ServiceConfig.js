/**
 * Global Service Configuration
 * Centralized configuration for all CAP service endpoints
 */
sap.ui.define([], () => {
    "use strict";

    return {
        // Base service URL
        baseUrl: "/odata/v4/catalg",
        
        // Available endpoints mapping
        endpoints: {
            documentList: "EINV_DOCUMENT_LIST",
            companyMaster: "EINV_COMPANY_MASTER_DATA", 
            documentHistory: "EINV_DOCUMENT_HISTORY",
            invoiceCode: "EINV_INVOICE_CODE",
            taxCode: "EINV_TAX_CODE",
            paymentMethods: "EINV_PAYMENT_METHODS",
            fiscalRappList: "EINV_FISCAL_RAPP_LIST",
            fiscalRappData: "EINV_FISCAL_RAPP_DATA",
            tipidocExclude: "EINV_TIPIDOC_EXCLUDE",
            sourceSystem: "EINV_SOURCE_SYSTEM",
            ackTag: "EINV_ACK_TAG",
            checkFields: "EINV_CHECK_FIELDS",
            tag: "EINV_TAG",
            unmis: "EINV_UNMIS",
            condType: "EINV_COND_TYPE",
            text: "EINV_TEXT",
            invSender: "EINV_INV_SENDER",
            flowProg: "EINV_FLOW_PROG",
            structureFile: "EINV_STRUCTURE_FILE",
            bankData: "EINV_BANK_DATA",
            pdf: "EINV_PDF",
            flowSched: "EINV_FLOW_SCHED"
        },

        // Utility function to build service URLs
        getServiceUrl: function(endpoint, params) {
            const entity = this.endpoints[endpoint] || endpoint;
            let url = `${this.baseUrl}/${entity}`;
            
            if (params) {
                const queryString = Object.keys(params)
                    .map(key => `${key}=${params[key]}`)
                    .join('&');
                url += `?${queryString}`;
            }
            
            return url;
        },

        // Utility function to get service root URL
        getServiceRootUrl: function() {
            return this.baseUrl + "/";
        },

        // Alternative paths to test (in case the main path is wrong)
        alternativePaths: [
            "/odata/v4/catalgservice/", 
            "/odata/v4/CatalgService/",
            "/odata/v2/catalg/",
            "/api/v4/catalg/"
        ]
    };
});
