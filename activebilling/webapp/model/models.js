sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], 
function (JSONModel, Device) {
    "use strict";

    return {
        /**
         * Provides runtime information for the device the UI5 app is running on as a JSONModel.
         * @returns {sap.ui.model.json.JSONModel} The device model.
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        }, 

        createFilterModel: function () {
            var oModel = new sap.ui.model.json.JSONModel({

                // Company (multi input, array of strings)
                BUKRS: [],

                // Document Number (multi input, array of strings)
                BELNR: [],

                // Year range (two dates, default current year)
                YearFrom: "",
                YearTo: "",
                YearRange: "",

                // Document Date (date range)
                BLDATFrom: null,
                BLDATTo: null,
                BLDATRange: "",

                // Document Type (multi selection)
                BLART: [],

                // Origin System (dropdown, single selection)
                AWSYS: [],

                // Status (multi select)
                STATUS: [],

                // Client Code (multi selection)
                KUNNR: []
            });

            return oModel;
        },

        createAppModel: function () {
            var oModel = new JSONModel({
                rows: [
                    {
                        BUKRS: "G042",
                        BELNR: "2575000011",
                        GJAHR: "2025",
                        FISC_RAP: "",
                        INV_TYPE: "380",
                        BLART: "EA",
                        BLDAT: "2025-01-20",
                        BUDAT: "2025-01-20",
                        CURRENCY: "EUR",
                        VBELN: "301211226",
                        DOC_TYPE_BTP: "",
                        KUNNR: "126127",
                        COUNTRY: "BE",
                        KSEF_ID: "",
                        KSEF_DATE: "",
                        STATUS: "03-SENT",
                        INSERT_DATE: "2025-01-20",
                        UPDATE_DATE: "2025-01-20",
                        USER_UPDATE: "SYSTEM",
                        ACK_CODE: "5",
                        ACK_DESCRIPTION: "",
                        ACK_DATE: "",
                        ACK_TIME: "",
                        ACK_USER: "",
                        ACK_USER_DESCR: "",
                        AWSYS: "VEHI"
                    },
                    {
                        BUKRS: "G042",
                        BELNR: "2556000003",
                        GJAHR: "2025",
                        FISC_RAP: "",
                        INV_TYPE: "381",
                        BLART: "FG",
                        BLDAT: "2025-01-09",
                        BUDAT: "2025-01-09",
                        CURRENCY: "EUR",
                        VBELN: "6000619299",
                        DOC_TYPE_BTP: "",
                        KUNNR: "126072",
                        COUNTRY: "BE",
                        KSEF_ID: "",
                        KSEF_DATE: "",
                        STATUS: "05-BTP_ERR",
                        INSERT_DATE: "2025-01-09",
                        UPDATE_DATE: "2025-01-09",
                        USER_UPDATE: "SYSTEM",
                        ACK_CODE: "5",
                        ACK_DESCRIPTION: "",
                        ACK_DATE: "",
                        ACK_TIME: "",
                        ACK_USER: "",
                        ACK_USER_DESCR: "",
                        AWSYS: "MISC"
                    },
                    {
                        BUKRS: "G042",
                        BELNR: "2551000381",
                        GJAHR: "2025",
                        FISC_RAP: "",
                        INV_TYPE: "380",
                        BLART: "EG",
                        BLDAT: "2025-02-13",
                        BUDAT: "2025-02-13",
                        CURRENCY: "EUR",
                        VBELN: "9900006941",
                        DOC_TYPE_BTP: "",
                        KUNNR: "124938",
                        COUNTRY: "BE",
                        KSEF_ID: "",
                        KSEF_DATE: "2025-02-13",
                        STATUS: "08-COMPLETED",
                        INSERT_DATE: "2025-02-13",
                        UPDATE_DATE: "2025-02-13",
                        USER_UPDATE: "SYSTEM",
                        ACK_CODE: "",
                        ACK_DESCRIPTION: "",
                        ACK_DATE: "2025-02-13",
                        ACK_TIME: "",
                        ACK_USER: "",
                        ACK_USER_DESCR: "",
                        AWSYS: "CONT"
                    },
                    {
                        BUKRS: "G042",
                        BELNR: "2575000012",
                        GJAHR: "2025",
                        FISC_RAP: "",
                        INV_TYPE: "380",
                        BLART: "EG",
                        BLDAT: "2025-01-15",
                        BUDAT: "2025-01-15",
                        CURRENCY: "EUR",
                        VBELN: "301211227",
                        DOC_TYPE_BTP: "",
                        KUNNR: "126127",
                        COUNTRY: "BE",
                        KSEF_ID: "",
                        KSEF_DATE: "",
                        STATUS: "05-BTP_ERR",
                        INSERT_DATE: "2025-01-15",
                        UPDATE_DATE: "2025-01-15",
                        USER_UPDATE: "SYSTEM",
                        ACK_CODE: "ACK0_KO",
                        ACK_DESCRIPTION: "Refusal from DT",
                        ACK_DATE: "2025-01-15",
                        ACK_TIME: "14:30:00",
                        ACK_USER: "DT_SYSTEM",
                        ACK_USER_DESCR: "DT System Rejection",
                        AWSYS: "VEHI"
                    },
                    {
                        BUKRS: "G042",
                        BELNR: "2556000004",
                        GJAHR: "2025",
                        FISC_RAP: "",
                        INV_TYPE: "381",
                        BLART: "FG",
                        BLDAT: "2025-01-18",
                        BUDAT: "2025-01-18",
                        CURRENCY: "EUR",
                        VBELN: "6000619300",
                        DOC_TYPE_BTP: "",
                        KUNNR: "126072",
                        COUNTRY: "BE",
                        KSEF_ID: "",
                        KSEF_DATE: "",
                        STATUS: "08-COMPLETED",
                        INSERT_DATE: "2025-01-18",
                        UPDATE_DATE: "2025-01-18",
                        USER_UPDATE: "SYSTEM",
                        ACK_CODE: "ACK0_OK",
                        ACK_DESCRIPTION: "Acceptance from DT",
                        ACK_DATE: "2025-01-18",
                        ACK_TIME: "16:45:00",
                        ACK_USER: "DT_SYSTEM",
                        ACK_USER_DESCR: "DT System Acceptance",
                        AWSYS: "MISC"
                    },
                    {
                        BUKRS: "G042",
                        BELNR: "2551000382",
                        GJAHR: "2025",
                        FISC_RAP: "",
                        INV_TYPE: "380",
                        BLART: "EA",
                        BLDAT: "2025-01-22",
                        BUDAT: "2025-01-22",
                        CURRENCY: "EUR",
                        VBELN: "9900006942",
                        DOC_TYPE_BTP: "",
                        KUNNR: "124938",
                        COUNTRY: "BE",
                        KSEF_ID: "",
                        KSEF_DATE: "2025-01-22",
                        STATUS: "08-COMPLETED",
                        INSERT_DATE: "2025-01-22",
                        UPDATE_DATE: "2025-01-22",
                        USER_UPDATE: "SYSTEM",
                        ACK_CODE: "AERC",
                        ACK_DESCRIPTION: "Government delivery receipt",
                        ACK_DATE: "2025-01-22",
                        ACK_TIME: "10:15:00",
                        ACK_USER: "BE_SYSTEM",
                        ACK_USER_DESCR: "BE Government System",
                        AWSYS: "CONT"
                    }
                ]
            });
            oModel.setDefaultBindingMode("TwoWay");
            oModel.setSizeLimit(99999);
            return oModel;

        },

        createHistoryModel: function () {
            var oModel = new JSONModel({
                currentDocument: null,
                historyData: [],
                hasDownloadPermission: false
            });
            oModel.setDefaultBindingMode("TwoWay");
            return oModel;
        },

        createRoleModel: function () {
            var oModel = new JSONModel({
                canAssignAckUser: false,
                canDownloadCsv: false,
                userRoles: []
            });
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

    };

});