sap.ui.define([
    "cnh/ab/activebilling/controller/BaseController",
    "sap/m/MessageBox",
    "sap/m/Token",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "cnh/ab/activebilling/utils/Formatter",
    "sap/m/MessageToast",
    "cnh/ab/activebilling/utils/ServiceConfig"
], (BaseController, MessageBox, Token, Filter, FilterOperator, JSONModel, Formatter, MessageToast, ServiceConfig) => {
    "use strict";

    return BaseController.extend("cnh.ab.activebilling.controller.Main", {

        formatter: Formatter,

         onInit() {
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteMain").attachMatched(this.onRouteMatched, this);
            
            // Initialize ACK User model
            this._initAckUserModel();
            
            // Initialize language selector
            this._initLanguageSelector();
        },

        onAfterRendering: function() {
            // Call parent onAfterRendering first
            if (BaseController.prototype.onAfterRendering) {
                BaseController.prototype.onAfterRendering.apply(this, arguments);
            }
            
            // Modify the Go button text
            this._modifyFilterBarButton();
        },

        _modifyFilterBarButton: function() {
            setTimeout(() => {
                // Use CSS selector to find the BDI element
                const $bdiElement = $('[id*="filterbar-btnGo-BDI-content"]');
                if ($bdiElement.length > 0) {
                    $bdiElement.text('Search');
                }
            }, 100);
        },


         onRouteMatched: function () {
            this._oBundleI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            
            // Load dynamic filter data first, then load documents
            this._loadFilterData().then(() => {
                this._loadDocumentData();
            });
        },

        onSearch: function() {
            this._applyFilters();
        },

        onFilterChange: function() {
            // No automatic filtering - only when search button is clicked
        },

        onAfterVariantLoad: function() {
            // Apply filters when variant is loaded (user selects a saved filter)
            this._applyFilters();
        },

        onClear: function() {
            // Clear all filters and reset to default values
            // clearAllFilters() already calls _applyFilters() which loads data
            this.clearAllFilters();
        },

        // Main filtering logic - calls API with filter parameters
        _applyFilters: function() {
            const oFilterModel = this.getView().getModel("filterModel");
            
            if (!oFilterModel) {
                console.warn("Missing FilterModel for filtering");
                return;
            }

            // Gather all current filter values from the FilterModel
            const oFilterData = oFilterModel.getData();
            console.log("Applying filters with data:", oFilterData);

            // Build OData query parameters from filter data
            const sQueryParams = this._buildODataQueryParams(oFilterData);
            console.log("Built OData query params:", sQueryParams);

            // Load data with filters from API
            this._loadDocumentData(sQueryParams);
        },

        // Build OData query parameters from FilterModel values
        _buildODataQueryParams: function(oFilterData) {
            const aFilters = [];

            // BUKRS (Company) - MultiInput array
            if (oFilterData.BUKRS && oFilterData.BUKRS.length > 0) {
                const sBukrsFilter = oFilterData.BUKRS.map(sValue => `BUKRS eq '${sValue}'`).join(' or ');
                aFilters.push(`(${sBukrsFilter})`);
            }

            // BELNR (Document Number) - MultiInput array
            if (oFilterData.BELNR && oFilterData.BELNR.length > 0) {
                const sBelnrFilter = oFilterData.BELNR.map(sValue => `BELNR eq '${sValue}'`).join(' or ');
                aFilters.push(`(${sBelnrFilter})`);
            }

            // GJAHR (Year) - Single year from DatePicker
            if (oFilterData.GJAHR) {
                aFilters.push(`GJAHR eq '${oFilterData.GJAHR}'`);
            }

            // BLDAT (Document Date) - Date range
            if (oFilterData.BLDATFrom && oFilterData.BLDATTo) {
                aFilters.push(`BLDAT ge ${oFilterData.BLDATFrom} and BLDAT le ${oFilterData.BLDATTo}`);
            }

            // BLART (Document Type) - Multi selection
            if (oFilterData.BLART && oFilterData.BLART.length > 0) {
                const sBlartFilter = oFilterData.BLART.map(sValue => `BLART eq '${sValue}'`).join(' or ');
                aFilters.push(`(${sBlartFilter})`);
            }

            // AWSYS (Origin System) - Multi selection
            if (oFilterData.AWSYS && oFilterData.AWSYS.length > 0) {
                const sAwsysFilter = oFilterData.AWSYS.map(sValue => `AWSYS eq '${sValue}'`).join(' or ');
                aFilters.push(`(${sAwsysFilter})`);
            }

            // STATUS (Document Status) - Multi selection
            if (oFilterData.STATUS && oFilterData.STATUS.length > 0) {
                const sStatusFilter = oFilterData.STATUS.map(sValue => `STATUS eq '${sValue}'`).join(' or ');
                aFilters.push(`(${sStatusFilter})`);
            }

            // KUNNR (Client Code) - Multi selection
            if (oFilterData.KUNNR && oFilterData.KUNNR.length > 0) {
                const sKunnrFilter = oFilterData.KUNNR.map(sValue => `KUNNR eq '${sValue}'`).join(' or ');
                aFilters.push(`(${sKunnrFilter})`);
            }

            // Combine all filters with AND logic
            if (aFilters.length > 0) {
                return `$filter=${aFilters.join(' and ')}`;
            }

            return '';
        },

        // Helper method to clear all filters
        clearAllFilters: function() {
            const oFilterModel = this.getView().getModel("filterModel");
            if (oFilterModel) {
                // Reset all filter values to default
                oFilterModel.setData({
                    BUKRS: [],
                    BELNR: [],
                    YearFrom: new Date().getFullYear().toString(),
                    YearTo: new Date().getFullYear().toString(),
                    BLDATFrom: "",
                    BLDATTo: "",
                    BLDATRange: "",
                    BLART: [],
                    AWSYS: [],
                    STATUS: [],
                    KUNNR: [],
                    GJAHR: "", // Added for single year DatePicker
                    documentTypes: [], // Added for dynamic document types
                    originSystems: [] // Added for dynamic origin systems
                });
                
                // Clear any tokens from MultiInput controls
                this._clearMultiInputTokens();
                
                // Apply filters (which will show all data since filters are cleared)
                this._applyFilters();
                
                console.log("All filters cleared and table refreshed");
            }
        },

        // Helper method to clear tokens from MultiInput controls
        _clearMultiInputTokens: function() {
            // Clear BUKRS MultiInput
            const oBUKRSInput = this.byId("multiInput1");
            if (oBUKRSInput) {
                oBUKRSInput.removeAllTokens();
            }
            
            // Clear BELNR MultiInput
            const oBELNRInput = this.byId("multiInput2");
            if (oBELNRInput) {
                oBELNRInput.removeAllTokens();
            }
        },

        // Event handlers for other filter controls
        onComboBoxChange: function(oEvent) {
            // No automatic filtering - only when search button is clicked
        },

        onBldatRangeChange: function(oEvent) {
            const oDateRangeSelection = oEvent.getSource(),
                  sValue = oDateRangeSelection.getValue(),
                  oFilterModel = this.getView().getModel("filterModel");

            if (oFilterModel) {
                // Handle empty/cleared values
                if (!sValue || sValue.trim() === "") {
                    oFilterModel.setProperty("/BLDATFrom", "");
                    oFilterModel.setProperty("/BLDATTo", "");
                    oFilterModel.setProperty("/BLDATRange", "");
                    console.log("Cleared BLDAT range");
                    return;
                }

                // DateRangeSelection returns value in format "dd/MM/yyyy - dd/MM/yyyy" or "dd/MM/yyyy"
                const aDateParts = sValue.split(" - ").map(s => s.trim());
                console.log("BLDAT DateRangeSelection value:", sValue, "Split parts:", aDateParts);
                
                // Helper function to convert dd/MM/yyyy to yyyy-MM-dd
                const convertDateFormat = (sDate) => {
                    if (sDate.includes('/')) {
                        // Convert from dd/MM/yyyy to yyyy-MM-dd
                        const aParts = sDate.split('/');
                        if (aParts.length === 3) {
                            return `${aParts[2]}-${aParts[1].padStart(2, '0')}-${aParts[0].padStart(2, '0')}`;
                        }
                    }
                    return sDate; // Return as-is if already in yyyy-MM-dd format
                };
                
                if (aDateParts.length === 2) {
                    const sFromDate = convertDateFormat(aDateParts[0]),
                          sToDate = convertDateFormat(aDateParts[1]);
                    
                    if (sFromDate && sToDate) {
                        oFilterModel.setProperty("/BLDATFrom", sFromDate);
                        oFilterModel.setProperty("/BLDATTo", sToDate);
                        console.log("Set BLDAT range:", sFromDate, "to", sToDate);
                    }
                } else if (aDateParts.length === 1) {
                    const sDate = convertDateFormat(aDateParts[0].trim());
                    if (sDate) {
                        oFilterModel.setProperty("/BLDATFrom", sDate);
                        oFilterModel.setProperty("/BLDATTo", sDate);
                        console.log("Set BLDAT single date:", sDate);
                    }
                }
            }
        },

         onYearChange: function(oEvent) {
            const oDatePicker = oEvent.getSource(),
                  sValue = oDatePicker.getValue(),
                  oFilterModel = this.getView().getModel("filterModel");

            if (oFilterModel) {
                if (sValue) {
                    oFilterModel.setProperty("/GJAHR", sValue);
                } else {
                    oFilterModel.setProperty("/GJAHR", "");
                }
            }
        },

        onMultiComboBoxChange: function(oEvent) {
            // No automatic filtering - only when search button is clicked
        },

        onMultiInputTokenUpdate: function (oEvent) {
            const oMI = oEvent.getSource(),
                sProp = oMI.data('prop'),
                oModel = this.getView().getModel("filterModel");
            if (!oModel) return;

            let aModelValues = (oModel.getProperty("/" + sProp) || []).slice();

            const aAdded = oEvent.getParameter("addedTokens") || [];
            const aRemoved = oEvent.getParameter("removedTokens") || [];

            const tokenText = (x) =>
                typeof x === "string" ? x.trim() :
                x?.getText ? x.getText().trim() : "";

            // Add new tokens
            aAdded.forEach((t) => {
                const s = tokenText(t);
                if (s && !aModelValues.includes(s)) aModelValues.push(s);
            });

            // Remove tokens
            aRemoved.forEach((t) => {
                const s = tokenText(t);
                aModelValues = aModelValues.filter((val) => val !== s);
            });

            oModel.setProperty("/" + sProp, aModelValues);
        },

        // optional fallback for pasted/comma-separated input that didn't auto-tokenize:
        onMultiInputChange: function(oEvent) {
            var oMI = oEvent.getSource(),
                sProp = oMI.data('prop'),
                sNewValue = oEvent.getParameter("newValue") || oMI.getValue();

            if (!sNewValue || !sNewValue.trim()) { return; }

            var aParts = sNewValue.split(/[;,]+/).map(function(v){ return v.trim(); }).filter(Boolean);
            aParts.forEach(function(s) {
                if (!oMI.getTokens().some(function(t){ return t.getText() === s; })) {
                    oMI.addToken(new Token({ text: s }));
                }
            });
            oMI.setValue("");
            // tokenUpdate will fire after tokens are added and will sync the model,
            // but we also sync here just in case
            this._syncMultiInputTokensToModel(oMI, sProp);
        },


        _syncMultiInputTokensToModel: function(oMultiInput, sProp) {
            var aValues = oMultiInput.getTokens().map(function(t){ return t.getText(); });
            this.getView().getModel("filterModel").setProperty("/" + sProp, aValues);
        },

        onTableBtnPressed: function (evt){
            const sAction = evt.getSource().data("function");

            const oTable = this.byId("tableDocuments");
            const aSelectedIndices = oTable.getSelectedIndices();

            if (aSelectedIndices.length === 0) {
                MessageBox.error(this._getText("noRowSelected"));
                return;
            }

            // Get all selected records
            const aSelectedRecords = aSelectedIndices.map(iIndex => {
                const oContextData = oTable.getContextByIndex(iIndex).getObject();
                return JSON.parse(JSON.stringify(oContextData));
            });

            // Validate ACK_CODE for all selected records
            const aInvalidRecords = aSelectedRecords.filter(record => record.STATUS !== "05-BTP_ERR");
            if (aInvalidRecords.length > 0) {
                MessageBox.error(this._getText("ackUserCodeError"));
                return;
            }

            this._confirmAndExecuteTableAction(sAction, aSelectedRecords);
        },

        _confirmAndExecuteTableAction: function(sAction, aRowData) {
            const iRecordCount = aRowData.length;
            
            // Create a list of document numbers for display
            const aDocumentNumbers = aRowData.map(record => 
                `${record.BELNR}`
            );
            const sDocumentList = aDocumentNumbers.join('\n');
            
            const sBaseMessage = sAction === "Resend" 
                ? this._getText("confirmResendMessageMultiple", [iRecordCount])
                : this._getText("confirmCancelMessageMultiple", [iRecordCount]);
            
            const sMessage = `${sBaseMessage}\n\nSelected Documents:\n${sDocumentList}`;
                
            MessageBox.warning(sMessage, {
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: function (sChoice) {
                    if (sChoice === MessageBox.Action.YES) {
                        this._executeTableAction(sAction, aRowData);
                    }
                }.bind(this)
            });
        },

        _executeTableAction: async function(sAction, aRowData) {
            const actionMap = {
                Resend: this._handleResend.bind(this),
                Cancel: this._handleCancel.bind(this)
            };

            const fn = actionMap[sAction];
            if (!fn) {
                MessageBox.error(this._getText("unknownAction", [sAction]));
                return;
            }

            this.showBusy();
            try {
                // Process all selected records
                const aResults = [];
                for (const oRowData of aRowData) {
                    await fn(oRowData);
                    aResults.push(oRowData);
                }
                
                const iProcessedCount = aResults.length;
                const successKey = sAction === "Resend" ? "resendSuccessMultiple" : sAction === "Cancel" ? "cancelSuccessMultiple" : "actionSuccessMultiple";
                MessageToast.show(this._getText(successKey, [iProcessedCount]));
            } catch (err) {
                MessageBox.error(err && err.message ? err.message : this._getText("actionError"));
            } finally {
                this.hideBusy();
            }
        },

        _handleResend: async function(oRowData) {
            try {
                // Prepare update data with new status
                const oUpdateData = {
                    STATUS: "07-RESEND"
                };
                
                // Make PATCH call to EINV_DOCUMENT_LIST entity
                const response = await fetch(`${ServiceConfig.getServiceUrl("documentList")}(${oRowData.ID})`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(oUpdateData)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // Update status locally after successful API call
                this._updateDocumentStatus(oRowData, "07-RESEND");
                MessageToast.show(this._getText("documentStatusResend"));
            } catch (error) {
                throw new Error("Failed to resend document: " + error.message);
            }
        },

        _handleCancel: async function(oRowData) {
            try {
                // Prepare update data with new status
                const oUpdateData = {
                    STATUS: "04-CANC"
                };
                
                // Make PATCH call to EINV_DOCUMENT_LIST entity
                const response = await fetch(`${ServiceConfig.getServiceUrl("documentList")}(${oRowData.ID})`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(oUpdateData)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // Update status locally after successful API call
                this._updateDocumentStatus(oRowData, "04-CANC");
                MessageToast.show(this._getText("documentStatusCancel"));
            } catch (error) {
                throw new Error("Failed to cancel document: " + error.message);
            }
        },

        _updateDocumentStatus: function(oRowData, sNewStatus) {
            const oAppModel = this.getView().getModel("app");
            const aRows = oAppModel.getProperty("/rows");
            
            // Find and update the specific row
            const iIndex = aRows.findIndex(row => 
                row.BUKRS === oRowData.BUKRS && 
                row.BELNR === oRowData.BELNR && 
                row.GJAHR === oRowData.GJAHR
            );
            
            if (iIndex !== -1) {
                aRows[iIndex].STATUS = sNewStatus;
                aRows[iIndex].UPDATE_DATE = new Date().toISOString().split('T')[0];
                aRows[iIndex].USER_UPDATE = "CURRENT_USER"; // TODO: Get actual user
                
                oAppModel.setProperty("/rows", aRows);
            }
        },

        _getText: function(sKey, aArgs) {
            var oBundle = this._oBundleI18n || this.getOwnerComponent().getModel("i18n").getResourceBundle();
            return oBundle.getText(sKey, aArgs);
        },

        showPopUpConfirmation: function () {
            const oTable = this.byId("tableDocuments"),
                iSelectedIndex = oTable.getSelectedIndex(),
                oAppModel = this.getAppModel();
        
            if (iSelectedIndex === -1) {
                MessageBox.error(this._oBundleI18n.getText("noFondoSelectedErrorDelete"));
                return;
            }
        
            const oSelectedContextData = oTable.getContextByIndex(iSelectedIndex).getObject();
            const oClonedData = JSON.parse(JSON.stringify(oSelectedContextData));
        
            MessageBox.warning(this._oBundleI18n.getText("buttonWarning"), {
                actions: ["Yes", MessageBox.Action.CANCEL],
                emphasizedAction: "Yes",
                onClose: async function (sAction) {
                    if (sAction === "Yes") {
                        this.showBusy();
        
                        const deleteUrl = `${this.baseUrl}${this.passivoDeleteUrl}`;
        
                        try {
                            const res = await fetch(encodeURI(deleteUrl), {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({ idPrimaryKey: oClonedData.idPrimaryKey })
                            });
        
                            if (!res.ok) {
                                throw new Error("Errore nella cancellazione, status: " + res.status);
                            }
        
                            MessageBox.success(this._oBundleI18n.getText("deleteSuccessMsg"));
                        } catch (err) {
                            MessageBox.error(err.message);
                        } finally {
                            this.hideBusy();
                        }
                    }
                }.bind(this)
            });
        },

        // ACK User functionality
        _initAckUserModel: function() {
            const oAckUserModel = new JSONModel({
                selectedAckCode: "",
                ackUserText: "",
                currentDocument: null
            });
            this.getView().setModel(oAckUserModel, "ackUserModel");
        },

        onAckUserPressed: function(oEvent) {
            const oTable = this.byId("tableDocuments"),
                oContextData = oEvent.getSource().getBindingContext("app").getObject();

            const oClonedData = JSON.parse(JSON.stringify(oContextData));

            // Validate ACK_CODE
            if (oClonedData.ACK_CODE !== "ACK0_KO") {
                MessageBox.error(this._getText("ackUserCodeError"));
                return;
            }

            // Validate STATUS
            const aAllowedStatuses = ["01-NEW", "02-WAIT", "03-SENT", "05-BTP_ERR", "06-DT_ERR", "09-COMM_ERR"];
            if (!aAllowedStatuses.includes(oClonedData.STATUS)) {
                MessageBox.error(this._getText("ackUserStatusError", [oClonedData.STATUS]));
                return;
            }

            // Store current document and reset form
            const oAckUserModel = this.getView().getModel("ackUserModel");
            oAckUserModel.setProperty("/currentDocument", oClonedData);
            oAckUserModel.setProperty("/selectedAckCode", "");
            oAckUserModel.setProperty("/ackUserText", "");

            // Load and open dialog fragment
            this._openAckUserDialog();
        },

        _openAckUserDialog: function() {
            if (!this._oAckUserDialog) {
                this._oAckUserDialog = sap.ui.xmlfragment(
                    "cnh.ab.activebilling.view.dialogs.AckUserDialog",
                    this
                );
                this.getView().addDependent(this._oAckUserDialog);
            }
            this._oAckUserDialog.open();
        },

        onAckUserCancel: function() {
            if (this._oAckUserDialog) {
                this._oAckUserDialog.close();
            }
        },

        onAckUserSave: async function() {
            const oAckUserModel = this.getView().getModel("ackUserModel");
            const oCurrentDocument = oAckUserModel.getProperty("/currentDocument");
            const sSelectedAckCode = oAckUserModel.getProperty("/selectedAckCode");
            const sAckUserText = oAckUserModel.getProperty("/ackUserText");

            if (!sSelectedAckCode) {
                MessageBox.error(this._getText("ackUserSelectError"));
                return;
            }

            try {
                // Save ACK User data to EINV_DOCUMENT_LIST via POST
                await this._saveAckUserToHistory(oCurrentDocument, sSelectedAckCode, sAckUserText);

                // Close dialog
                this.onAckUserCancel();

                MessageToast.show(this._getText("ackUserAssignedSuccess"));
            } catch (error) {
                MessageBox.error("Failed to assign ACK user: " + error.message);
            }
        },

        _saveAckUserToHistory: async function(oDocument, sAckCode, sAckUserText) {
            try {
                // Prepare update data with ACK user fields
                const oUpdateData = {
                    ACK_CODE: sAckCode,
                    ACK_USER: sAckCode,
                    ACK_USER_DESCR: sAckUserText || "",
                    ACK_DATE: new Date().toISOString().split('T')[0],
                    ACK_TIME: new Date().toTimeString().split(' ')[0]
                };
                
                // Make PATCH call to EINV_DOCUMENT_LIST entity to update ACK user fields
                const response = await fetch(`${ServiceConfig.getServiceUrl("documentList")}(${oDocument.ID})`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(oUpdateData)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // Update the main document's ACK_USER_DESCR and ACK_USER fields locally
                const oAppModel = this.getView().getModel("app");
                const aDocuments = oAppModel.getProperty("/rows");
                const oDocumentToUpdate = aDocuments.find(doc => 
                    doc.BUKRS === oDocument.BUKRS && 
                    doc.BELNR === oDocument.BELNR && 
                    doc.GJAHR === oDocument.GJAHR
                );
                
                if (oDocumentToUpdate) {
                    oDocumentToUpdate.ACK_CODE = sAckCode;
                    oDocumentToUpdate.ACK_USER_DESCR = sAckUserText || "";
                    oDocumentToUpdate.ACK_USER = sAckCode;
                    oDocumentToUpdate.ACK_DATE = new Date().toISOString().split('T')[0];
                    oDocumentToUpdate.ACK_TIME = new Date().toTimeString().split(' ')[0];
                    
                    // Refresh the model to update the UI
                    oAppModel.refresh();
                }
            } catch (error) {
                MessageToast.show("Failed to assign ACK user: " + error.message);
            }
        },

        // History functionality
        onHistoryPressed: function(oEvent) {
            const oTable = this.byId("tableDocuments"),
                oContextData = oEvent.getSource().getBindingContext("app").getObject();

            const oClonedData = JSON.parse(JSON.stringify(oContextData));

            // Store current document and load history data
            const oHistoryModel = this.getView().getModel("historyModel");
            oHistoryModel.setProperty("/currentDocument", oClonedData);
            
            // Load history data for this document
            this._loadDocumentHistory(oClonedData);
            
            // Open history dialog
            this._openHistoryDialog();
        },

        _loadDocumentHistory: function(oDocument) {
            // TODO: Replace with real API call to fetch history from EINV_DOCUMENT_HISTORY
            // Example: await fetch(`${this.baseUrl}/history?bukrs=${oDocument.BUKRS}&belnr=${oDocument.BELNR}&gjahr=${oDocument.GJAHR}`)
            
            // Mock history data for demonstration
            const aMockHistoryData = [
                {
                    MANDT: "100",
                    BUKRS: oDocument.BUKRS,
                    BELNR: oDocument.BELNR,
                    GJAHR: oDocument.GJAHR,
                    RECORD_TYPE: "01",
                    STATUS: "01",
                    ACK_CODE: "",
                    TIMESTAMP: "20250120120000",
                    USER: "SYSTEM",
                    FILE_NAME: "invoice_001.csv",
                    FILE_NAME_ACK: "",
                    ACK_DATE: "",
                    ACK_TIME: "",
                    FILE_CONTENT_ID: "CONTENT_001",
                    ERROR_STEP: "",
                    ERROR_MESSAGE: ""
                },
                {
                    MANDT: "100",
                    BUKRS: oDocument.BUKRS,
                    BELNR: oDocument.BELNR,
                    GJAHR: oDocument.GJAHR,
                    RECORD_TYPE: "02",
                    STATUS: "03",
                    ACK_CODE: "USR01",
                    TIMESTAMP: "20250120130000",
                    USER: "ADMIN",
                    FILE_NAME: "invoice_001.csv",
                    FILE_NAME_ACK: "ack_001.xml",
                    ACK_DATE: "2025-01-20",
                    ACK_TIME: "13:00:00",
                    FILE_CONTENT_ID: "CONTENT_001",
                    ERROR_STEP: "",
                    ERROR_MESSAGE: "Document sent successfully"
                }
            ];

            const oHistoryModel = this.getView().getModel("historyModel");
            oHistoryModel.setProperty("/historyData", aMockHistoryData);
            
            // Check if user has download permission (mock for now)
            const oRoleModel = this.getView().getModel("roleModel");
            const bCanDownload = oRoleModel.getProperty("/canDownloadCsv");
            oHistoryModel.setProperty("/hasDownloadPermission", bCanDownload);
        },

        _openHistoryDialog: function() {
            if (!this._oHistoryDialog) {
                this._oHistoryDialog = sap.ui.xmlfragment(
                    "historyDialogFragment",
                    "cnh.ab.activebilling.view.dialogs.HistoryDialog",
                    this
                );
                this.getView().addDependent(this._oHistoryDialog);
            }
            this._oHistoryDialog.open();
        },

        onHistoryDialogClose: function() {
            if (this._oHistoryDialog) {
                this._oHistoryDialog.close();
            }
        },

        onHistorySelectionChange: function(oEvent) {
            const oHistoryTable = this.byId("historyTable");
            const iSelectedIndex = oHistoryTable.getSelectedIndex();
            
            if (iSelectedIndex !== -1) {
                const oSelectedContextData = oHistoryTable.getContextByIndex(iSelectedIndex).getObject();
                const oHistoryRecord = oSelectedContextData.getObject();
                
                // Log the selected record for debugging
                console.log("History record selected:", oHistoryRecord);
                
                // You can add additional logic here if needed
                // For example, enabling/disabling buttons based on selection
                // or showing additional details about the selected record
            }
        },

        onDownloadCsvPressed: function(oEvent) {
            // Now we can use the fragment ID to access the table
            const oHistoryTable = sap.ui.core.Fragment.byId("historyDialogFragment", "historyTable");
            
            if (!oHistoryTable) {
                console.error("History table not found in fragment");
                MessageBox.error("Unable to access history table");
                return;
            }
            
            const aSelectedIndices = oHistoryTable.getSelectedIndices();

            if (aSelectedIndices.length === 0) {
                MessageBox.error(this._getText("noHistoryRecordSelected"));
                return;
            }

            // Check if more than one row is selected - show error
            if (aSelectedIndices.length > 1) {
                MessageBox.error(this._getText("multipleHistoryRecordsError"));
                return;
            }

            // Get the single selected history record
            const oContextData = oHistoryTable.getContextByIndex(aSelectedIndices[0]).getObject();

            // Validate that the record has a CSV file
            if (!oContextData.FILE_NAME) {
                MessageBox.error(this._getText("noCsvFileAvailable"));
                return;
            }

            // TODO: Replace with real API call to download CSV
            // Example: window.open(`${this.baseUrl}/downloadCsv?fileId=${oHistoryRecord.FILE_CONTENT_ID}`)
            
            // Show success message
            MessageBox.success(this._getText("csvDownloadSuccess", [oContextData.FILE_NAME]));
        },

        // Language selector functionality
        _initLanguageSelector: function() {
            const oComponent = this.getOwnerComponent();
            const aAvailableLanguages = oComponent.getAvailableLanguages();
            const sCurrentLanguage = oComponent._sCurrentLocale || "en";
            
            // Create model for language selector
            const oLanguageModel = new JSONModel({
                availableLanguages: aAvailableLanguages,
                currentLanguage: sCurrentLanguage
            });
            
            this.getView().setModel(oLanguageModel);
        },

        onLanguageChange: function(oEvent) {
            const sSelectedLanguage = oEvent.getParameter("selectedItem").getKey();
            const oComponent = this.getOwnerComponent();
            
            // Switch language
            oComponent.switchLanguage(sSelectedLanguage);
        },

        // Cleanup method to destroy dialogs when controller is destroyed
        onExit: function() {
            if (this._oAckUserDialog) {
                this._oAckUserDialog.destroy();
                this._oAckUserDialog = null;
            }
            if (this._oHistoryDialog) {
                this._oHistoryDialog.destroy();
                this._oHistoryDialog = null;
            }
        },
        
        // Load dynamic filter data from entities
        _loadFilterData: function() {
            const aPromises = [
                this._loadDocumentTypes(),
                this._loadOriginSystems()
            ];
            
            return Promise.all(aPromises).catch(error => {
                console.error("Error loading filter data:", error);
                MessageToast.show("Failed to load filter options");
            });
        },

        // Load Document Type options from EINV_INVOICE_CODE entity
        _loadDocumentTypes: function() {
            return fetch(ServiceConfig.getServiceUrl("invoiceCode"))
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.value) {
                        const aDocumentTypes = data.value.map(item => ({
                            key: item.INVOICE_CODE || item.BLART,
                            text: item.INVOICE_DESCR || item.BLART_DESCR || item.INVOICE_CODE || item.BLART
                        }));
                        
                        // Store in a dedicated model or extend existing model
                        const oFilterModel = this.getView().getModel("filterModel");
                        if (oFilterModel) {
                            oFilterModel.setProperty("/documentTypes", aDocumentTypes);
                        }
                        
                        console.log("Loaded document types:", aDocumentTypes);
                    }
                })
                .catch(error => {
                    console.error("Error loading document types:", error);
                });
        },

        // Load Origin System options from EINV_SOURCE_SYSTEM entity
        _loadOriginSystems: function() {
            return fetch(ServiceConfig.getServiceUrl("sourceSystem"))
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.value) {
                        const aOriginSystems = data.value.map(item => ({
                            key: item.AWSYS || item.SOURCE_SYSTEM,
                            text: item.AWSYS_DESCR || item.SOURCE_SYSTEM_DESCR || item.AWSYS || item.SOURCE_SYSTEM
                        }));
                        
                        // Store in a dedicated model or extend existing model
                        const oFilterModel = this.getView().getModel("filterModel");
                        if (oFilterModel) {
                            oFilterModel.setProperty("/originSystems", aOriginSystems);
                        }
                        
                        console.log("Loaded origin systems:", aOriginSystems);
                    }
                })
                .catch(error => {
                    console.error("Error loading origin systems:", error);
                });
        },

        // Load document data from OData service into app model with optional filters
        _loadDocumentData: function(sQueryParams = '') {
            const oAppModel = this.getView().getModel("app");
            if (!oAppModel) {
                return;
            }

            // Build the complete URL with optional query parameters
            let sUrl = ServiceConfig.getServiceUrl("documentList");
            if (sQueryParams) {
                sUrl += (sUrl.includes('?') ? '&' : '?') + sQueryParams;
            }

            console.log("Loading documents from URL:", sUrl);

            fetch(sUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.value) {
                        // data.value[0].STATUS = '05-BTP_ERR';
                        oAppModel.setProperty("/rows", data.value);
                        const iCount = data.value.length;
                        MessageToast.show(sQueryParams ? `Loaded ${iCount} filtered documents` : `Loaded ${iCount} documents`);
                    } else {
                        oAppModel.setProperty("/rows", []);
                        MessageToast.show(sQueryParams ? "No documents match the filters" : "No documents found");
                    }
                })
                .catch(error => {
                    console.error("Error loading documents:", error);
                    MessageToast.show("Failed to load documents: " + error.message);
                    oAppModel.setProperty("/rows", []);
                });
        }



    });
});