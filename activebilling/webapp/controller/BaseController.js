sap.ui.define([
    "sap/ui/core/mvc/Controller"
  ], function (Controller) {
    "use strict";
  
    return Controller.extend("cnh.ab.activebilling.controller.BaseController", {
      
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        getAppModel: function () {
            return this.getView().getModel("app");
        },

        getFilterModel: function() {
            return this.getView().getModel("filter");
        },

        showMessage: function (sText) {
            sap.m.MessageToast.show(sText);
        },

        showBusy: function () {
            if (!this._busyDialog) {
                this._busyDialog = new sap.m.BusyDialog();
            }
            this._busyDialog.open()
        },

        hideBusy: function () {
            this._busyDialog.close();
        },

        openDialog: function (dialogPath) {
			if (!this.__dialog) {
				this.__dialog = sap.ui.xmlfragment(this.getView().getId(), dialogPath, this);
				this.getView().addDependent(this.__dialog);
			}
			return this.__dialog;
		},

		closeDialog: function () {
			if (this.__dialog) {
				if (this.__dialog.close) {
					this.__dialog.close();
				}
				this.__dialog.destroy();
				this.__dialog = null;
			}
		}
    });
  });
