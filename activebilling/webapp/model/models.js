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
                BLDATFrom: "",
                BLDATTo: "",
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
                rows: [ ]
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
                canAssignAckUser: true,
                canDownloadCsv: true,
                userRoles: []
            });
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        createVariantModel: function () {
            var oModel = new JSONModel({
                variants: [],
                currentVariantKey: "*standard*",
                defaultVariantKey: null,
                modified: false
            });
            oModel.setDefaultBindingMode("TwoWay");
            return oModel;
        }

    };

});