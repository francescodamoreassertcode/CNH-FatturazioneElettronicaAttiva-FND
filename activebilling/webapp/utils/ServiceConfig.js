sap.ui.define([], () => {
    "use strict";

    return {
        endpoints: {
            documentList: "http/getCAPDocumentList",
            patchDocumentList: "http/UpdateBKPF",
            documentHistory: "http/getCAPDocumentListHistory",
            pdfDownload: "http/EINV_GetInvoiceDocFromObjectStore",
            companyMaster: "http/getCAPMasterData",
            invoiceCode: "http/getCAPInvoiceCode",
            sourceSystem: "http/getCAPSourceSystem"
        },

        getServiceUrl: function(endpoint, queryParams) {
            const url = this.endpoints[endpoint] || endpoint;
            
            if (!queryParams) {
                return url;
            }

            if (typeof queryParams === 'string') {
                return `${url}?${queryParams}`;
            }

            const queryString = Object.keys(queryParams)
                .map(key => `${key}=${queryParams[key]}`)
                .join('&');
            
            return `${url}?${queryString}`;
        }
    };
});
