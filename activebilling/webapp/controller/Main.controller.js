sap.ui.define([
    "cnh/ab/activebilling/controller/BaseController",
    "sap/m/MessageBox",
    "sap/m/Token",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "cnh/ab/activebilling/utils/Formatter",
    "sap/m/MessageToast",
    "cnh/ab/activebilling/utils/ServiceConfig",
    "cnh/ab/activebilling/utils/VariantStorage",
    "sap/ui/comp/variants/VariantItem",
    "sap/ui/export/Spreadsheet",
    "sap/ui/export/library"
    ], (BaseController, MessageBox, Token, Filter, FilterOperator, JSONModel, Formatter, MessageToast, ServiceConfig, VariantStorage, VariantItem, Spreadsheet, exportLibrary) => {
    "use strict";
    
    const EdmType = exportLibrary.EdmType;
    
    return BaseController.extend("cnh.ab.activebilling.controller.Main", {
    
    formatter: Formatter,
    
    getAckDescriptionI18n: function(aDocumentHistories) {
        const sAckCode = Formatter.getMostRecentAckCode(aDocumentHistories);
        if (!sAckCode) return "";
        
        const oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
        const sI18nKey = `ackCode${sAckCode}`;
        return oResourceBundle.getText(sI18nKey, "", sAckCode); // Falls back to sAckCode if key not found
    },
    
    onInit() {
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.getRoute("RouteMain").attachMatched(this.onRouteMatched, this);
    
        // Initialize ACK User model
        this._initAckUserModel();
    
        // Initialize language selector
        this._initLanguageSelector();
    
        // Initialize variant management
        this._initializeVariantManagement();
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
    
    
    onRouteMatched: function() {
        this._oBundleI18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
    
        // Load dynamic filter data first, then load documents
        this._loadFilterData().then(() => {
            // Load variant filters if needed (first time after app init)
            if (this._bNeedToLoadVariantOnStart) {
                this._bNeedToLoadVariantOnStart = false;
                const sCurrentKey = VariantStorage.getCurrentVariant();
                if (sCurrentKey && sCurrentKey !== "*standard*") {
                    const oVariant = VariantStorage.getVariant(sCurrentKey);
                    if (oVariant) {
                        console.log("Auto-loading variant filters:", oVariant.name);
                        this._loadVariantFilters(oVariant);
                    }
                }
            } else {
                // Normal route - just load documents
                this._loadDocumentData();
            }
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
    
        // INV_TYPE (Invoice Type) - Multi selection
        if (oFilterData.INV_TYPE && oFilterData.INV_TYPE.length > 0) {
            const sInvTypeFilter = oFilterData.INV_TYPE.map(sValue => `INV_TYPE eq '${sValue}'`).join(' or ');
            aFilters.push(`(${sInvTypeFilter})`);
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
            // Reset only the filter values to default, preserve dynamic data
            oFilterModel.setProperty("/BUKRS", []);
            oFilterModel.setProperty("/BELNR", []);
            oFilterModel.setProperty("/YearFrom", new Date().getFullYear().toString());
            oFilterModel.setProperty("/YearTo", new Date().getFullYear().toString());
            oFilterModel.setProperty("/BLDATFrom", "");
            oFilterModel.setProperty("/BLDATTo", "");
            oFilterModel.setProperty("/BLDATRange", "");
            oFilterModel.setProperty("/INV_TYPE", []);
            oFilterModel.setProperty("/AWSYS", []);
            oFilterModel.setProperty("/STATUS", []);
            oFilterModel.setProperty("/KUNNR", []);
            oFilterModel.setProperty("/GJAHR", ""); // Single year DatePicker
    
            // Clear any tokens from MultiInput controls
            this._clearMultiInputTokens();
    
            // Apply filters (which will show all data since filters are cleared)
            this._applyFilters();
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
    
        // Clear KUNNR MultiInput
        const oKUNNRInput = this.byId("multiInput3");
        if (oKUNNRInput) {
            oKUNNRInput.removeAllTokens();
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
    
    // Company ValueHelp Dialog methods
    onCompanyValueHelpRequest: function(oEvent) {
        const oMultiInput = oEvent.getSource();
        let oDialog = this.byId("companyValueHelpDialog");
    
        // Store reference to the MultiInput for later use
        this._oCompanyMultiInput = oMultiInput;
    
        // Create dialog if it doesn't exist
        if (!oDialog) {
            this._createCompanyValueHelpDialog().then(function(oDialog) {
                this._preSelectCompanies();
                oDialog.open();
            }.bind(this));
        } else {
            // Pre-select currently selected companies
            this._preSelectCompanies();
            oDialog.open();
        }
    },
    
    _createCompanyValueHelpDialog: function() {
        const that = this;
    
        // Load the fragment
        return sap.ui.core.Fragment.load({
            id: this.getView().getId(),
            name: "cnh.ab.activebilling.view.dialogs.CompanyValueHelpDialog",
            controller: this
        }).then(function(oDialog) {
            that.getView().addDependent(oDialog);
            return oDialog;
        });
    },
    
    _preSelectCompanies: function() {
        const oTable = this.byId("companyValueHelpTable");
        const oFilterModel = this.getView().getModel("filterModel");
        const aCurrentBUKRS = oFilterModel.getProperty("/BUKRS") || [];
    
        if (oTable && aCurrentBUKRS.length > 0) {
            // Clear current selection
            oTable.removeSelections();
    
            // Pre-select companies that are already selected
            const aItems = oTable.getItems();
            aItems.forEach((oItem, iIndex) => {
                const oContext = oItem.getBindingContext("filterModel");
                if (oContext) {
                    const oData = oContext.getObject();
                    if (aCurrentBUKRS.includes(oData.BUKRS)) {
                        oTable.setSelectedIndex(iIndex);
                    }
                }
            });
        }
    },
    
    onCompanyTableSelectionChange: function(oEvent) {
        // This method can be used for real-time feedback if needed
        // For now, we'll handle selection in the OK button
    },
    
    onCompanyValueHelpOK: function() {
        const oTable = this.byId("companyValueHelpTable");
        const aSelectedIndices = oTable.getSelectedIndices();
        const oFilterModel = this.getView().getModel("filterModel");
    
        if (aSelectedIndices.length === 0) {
            MessageToast.show("Please select at least one company");
            return;
        }
    
        // Get selected company codes
        const aSelectedBUKRS = [];
        aSelectedIndices.forEach(iIndex => {
            const oItem = oTable.getItems()[iIndex];
            const oContext = oItem.getBindingContext("filterModel");
            if (oContext) {
                const oData = oContext.getObject();
                aSelectedBUKRS.push(oData.BUKRS);
            }
        });
    
        // Update filter model
        oFilterModel.setProperty("/BUKRS", aSelectedBUKRS);
    
        // Update MultiInput tokens
        this._updateMultiInputTokens(aSelectedBUKRS);
    
        // Close dialog
        this.byId("companyValueHelpDialog").close();
    
        MessageToast.show(`${aSelectedBUKRS.length} companies selected`);
    },
    
    onCompanyValueHelpCancel: function() {
        this.byId("companyValueHelpDialog").close();
    },
    
    _updateMultiInputTokens: function(aSelectedBUKRS) {
        const oMultiInput = this._oCompanyMultiInput;
        if (!oMultiInput) return;
    
        // Clear existing tokens
        oMultiInput.removeAllTokens();
    
        // Add new tokens
        aSelectedBUKRS.forEach(sBUKRS => {
            const oToken = new sap.m.Token({
                text: sBUKRS,
                key: sBUKRS
            });
            oMultiInput.addToken(oToken);
        });
    },
    
    // Search functionality for company ValueHelp dialog
    onCompanySearch: function(oEvent) {
        const sQuery = oEvent.getParameters().newValue;
        this._filterCompanies(sQuery);
    },
    
    onCompanySearchLiveChange: function(oEvent) {
        const sQuery = oEvent.getParameters().newValue;
        this._filterCompanies(sQuery);
    },
    
    _filterCompanies: function(sSearchQuery) {
        const oTable = this.byId("companyValueHelpTable");
        const oBinding = oTable.getBinding("items");
    
        if (!oBinding) {
            return;
        }
    
        if (!sSearchQuery || sSearchQuery.trim() === "") {
            // Clear all filters if search is empty
            oBinding.filter([]);
            return;
        }
    
        const sQuery = sSearchQuery.trim();
    
        // Create SAP UI5 filters for multiple fields
        const aFilters = [
            new Filter("BUKRS", FilterOperator.Contains, sQuery),
            new Filter("FLOW_DESCRIPTION", FilterOperator.Contains, sQuery),
            new Filter("COUNTRY_CLIENT", FilterOperator.Contains, sQuery),
            new Filter("VAT_PROVIDER", FilterOperator.Contains, sQuery),
            new Filter("FLOW", FilterOperator.Contains, sQuery)
        ];
    
        // Combine filters with OR logic
        const oCombinedFilter = new Filter(aFilters, false);
    
        // Apply filter to table binding
        oBinding.filter(oCombinedFilter);
    },
    
    onMultiInputTokenUpdate: function(oEvent) {
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
    
        if (!sNewValue || !sNewValue.trim()) {
            return;
        }
    
        var aParts = sNewValue.split(/[;,]+/).map(function(v) {
            return v.trim();
        }).filter(Boolean);
        aParts.forEach(function(s) {
            if (!oMI.getTokens().some(function(t) {
                    return t.getText() === s;
                })) {
                oMI.addToken(new Token({
                    text: s
                }));
            }
        });
        oMI.setValue("");
        // tokenUpdate will fire after tokens are added and will sync the model,
        // but we also sync here just in case
        this._syncMultiInputTokensToModel(oMI, sProp);
    },
    
    
    _syncMultiInputTokensToModel: function(oMultiInput, sProp) {
        var aValues = oMultiInput.getTokens().map(function(t) {
            return t.getText();
        });
        this.getView().getModel("filterModel").setProperty("/" + sProp, aValues);
    },
    
    onDownloadExcel: function() {
        this.showBusy();
        
        // Get current filter parameters (without $top limit)
        const oFilterModel = this.getView().getModel("filterModel");
        if (!oFilterModel) {
            this.hideBusy();
            MessageBox.error("Filter model not found");
            return;
        }
        
        const oFilterData = oFilterModel.getData();
        const sQueryParams = this._buildODataQueryParams(oFilterData);
        
        // Build query params for ALL records (no $top limit)
        let sFullQueryParams = sQueryParams;
        const sExpandParam = '$expand=documentHistories';
        
        if (sFullQueryParams) {
            sFullQueryParams += '&' + sExpandParam;
        } else {
            sFullQueryParams = sExpandParam;
        }
        
        const sUrl = ServiceConfig.getServiceUrl("documentList", sFullQueryParams);
        console.log("Downloading all filtered documents from URL:", sUrl);
        
        fetch(sUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.value && data.value.length > 0) {
                    this._exportToExcel(data.value);
                    MessageToast.show(`Exported ${data.value.length} documents to Excel`);
                } else {
                    MessageBox.information("No documents to export");
                }
            })
            .catch(error => {
                console.error("Error downloading documents:", error);
                MessageBox.error("Failed to download documents: " + error.message);
            })
            .finally(() => {
                this.hideBusy();
            });
    },
    
    _exportToExcel: function(aData) {
        // Prepare data for export - enrich with ACK_CODE and convert dates
        const aExportData = aData.map(oRow => {
            return {
                ...oRow,
                ACK_CODE: oRow.documentHistories && oRow.documentHistories.length > 0 
                    ? Formatter.getMostRecentAckCode(oRow.documentHistories) 
                    : "",
                // Convert date strings to Date objects for proper Excel export
                BUDAT: oRow.BUDAT ? new Date(oRow.BUDAT) : null,
                BLDAT: oRow.BLDAT ? new Date(oRow.BLDAT) : null
            };
        });
        
        // Define column configuration
        const aColumns = [
            { label: this._getText("bukrs"), property: "BUKRS", type: EdmType.String },
            { label: this._getText("belnr"), property: "BELNR", type: EdmType.String },
            { label: this._getText("gjahr"), property: "GJAHR", type: EdmType.String },
            { label: this._getText("status"), property: "STATUS", type: EdmType.String },
            { label: this._getText("inv_type"), property: "INV_TYPE", type: EdmType.String },
            { label: this._getText("budat"), property: "BUDAT", type: EdmType.Date, format: "dd/mm/yyyy" },
            { label: this._getText("blart"), property: "BLART", type: EdmType.String },
            { label: this._getText("currency"), property: "CURRENCY", type: EdmType.String },
            { label: this._getText("vbeln"), property: "VBELN", type: EdmType.String },
            { label: this._getText("kunnr"), property: "KUNNR", type: EdmType.String },
            { label: this._getText("bldat"), property: "BLDAT", type: EdmType.Date, format: "dd/mm/yyyy" },
            { label: this._getText("country"), property: "COUNTRY", type: EdmType.String },
            { label: this._getText("ack_code"), property: "ACK_CODE", type: EdmType.String },
            { label: this._getText("ack_user"), property: "ACK_USER", type: EdmType.String },
            { label: this._getText("ack_user_descr"), property: "ACK_USER_DESCR", type: EdmType.String },
            { label: this._getText("awsys"), property: "AWSYS", type: EdmType.String }
        ];
        
        // Generate filename with timestamp
        const sTimestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        
        // Create and build spreadsheet
        const oSpreadsheet = new Spreadsheet({
            workbook: {
                columns: aColumns
            },
            dataSource: aExportData,
            fileName: `Documents_${sTimestamp}.xlsx`
        });
        
        oSpreadsheet.build()
            .then(() => {
                console.log("Excel file exported successfully");
            })
            .catch((oError) => {
                console.error("Error exporting to Excel:", oError);
                MessageBox.error("Failed to generate Excel file: " + oError.message);
            });
    },
    
    onTableBtnPressed: function(evt) {
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
    
        // Validate ACK_STATUS for all selected records
        const aInvalidRecords = aSelectedRecords.filter(record => record.STATUS !== "05");
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
    
        const sBaseMessage = sAction === "Resend" ?
            this._getText("confirmResendMessageMultiple", [iRecordCount]) :
            this._getText("confirmCancelMessageMultiple", [iRecordCount]);
    
        const sMessage = `${sBaseMessage}\n\nSelected Documents:\n${sDocumentList}`;
    
        MessageBox.warning(sMessage, {
            actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.YES,
            onClose: function(sChoice) {
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
            MessageBox.success(this._getText(successKey, [iProcessedCount]));
        } catch (err) {
            MessageBox.error(err && err.message ? err.message : this._getText("actionError"));
        } finally {
            this.hideBusy();
        }
    },
    
    _handleResend: async function(oRowData) {
        try {
            const oUpdateData = {
                BUKRS: oRowData.BUKRS,
                GJAHR: oRowData.GJAHR,
                BELNR: oRowData.BELNR,
                STATUS: "07"
            };
    
            const response = await fetch(ServiceConfig.getServiceUrl("patchDocumentList"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(oUpdateData)
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            this._applyFilters();
        } catch (error) {
            throw new Error("Failed to resend document: " + error.message);
        }
    },
    
    _handleCancel: async function(oRowData) {
        try {
            const oUpdateData = {
                BUKRS: oRowData.BUKRS,
                GJAHR: oRowData.GJAHR,
                BELNR: oRowData.BELNR,
                STATUS: "04"
            };
    
            const response = await fetch(ServiceConfig.getServiceUrl("patchDocumentList"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(oUpdateData)
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            this._applyFilters();
        } catch (error) {
            throw new Error("Failed to cancel document: " + error.message);
        }
    },
    
    _getText: function(sKey, aArgs) {
        var oBundle = this._oBundleI18n || this.getOwnerComponent().getModel("i18n").getResourceBundle();
        return oBundle.getText(sKey, aArgs);
    },
    
    showPopUpConfirmation: function() {
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
            onClose: async function(sAction) {
                if (sAction === "Yes") {
                    this.showBusy();
    
                    const deleteUrl = `${this.baseUrl}${this.passivoDeleteUrl}`;
    
                    try {
                        const res = await fetch(encodeURI(deleteUrl), {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                idPrimaryKey: oClonedData.idPrimaryKey
                            })
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
    
        // Validate STATUS
        const aAllowedStatuses = ["05"];
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
            await this._saveAckUser(oCurrentDocument, sSelectedAckCode, sAckUserText);
    
            this.onAckUserCancel();
    
            MessageBox.success(this._getText("ackUserAssignedSuccess"));
        } catch (error) {
            MessageBox.error("Failed to assign ACK user: " + error.message);
        }
    },
    
    _saveAckUser: async function(oDocument, sAckCode, sAckUserText) {
        const oUpdateData = {
            BUKRS: oDocument.BUKRS,
            GJAHR: oDocument.GJAHR,
            BELNR: oDocument.BELNR,
            ACK_USER: sAckCode,
            ACK_USER_DESCR: sAckUserText || ""
        };
    
        const response = await fetch(ServiceConfig.getServiceUrl("patchDocumentList"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(oUpdateData)
        });
    
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    
        this._applyFilters();
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
        const oHistoryModel = this.getView().getModel("historyModel");
    
        MessageToast.show(this._oBundleI18n.getText("loadingHistory"));
    
        const sFilter = `BUKRS eq '${oDocument.BUKRS}' and BELNR eq '${oDocument.BELNR}' and GJAHR eq '${oDocument.GJAHR}'`;
        const sUrl = ServiceConfig.getServiceUrl("documentHistory", `$filter=${sFilter}`);
    
        console.log("Loading document history from URL:", sUrl);
    
        fetch(sUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.value) {
                    oHistoryModel.setProperty("/historyData", data.value);
    
                    const iCount = data.value.length;
                    MessageToast.show(this._oBundleI18n.getText("historyLoadedSuccess", [iCount]));
                } else {
                    oHistoryModel.setProperty("/historyData", []);
                    MessageToast.show(this._oBundleI18n.getText("noHistoryRecords"));
                }
            })
            .catch(error => {
                MessageToast.show(this._oBundleI18n.getText("historyLoadError") + ": " + error.message);
                oHistoryModel.setProperty("/historyData", []);
            })
            .finally(() => {
                // Check if user has download permission
                const oRoleModel = this.getView().getModel("roleModel");
                const bCanDownload = oRoleModel.getProperty("/canDownloadCsv");
                oHistoryModel.setProperty("/hasDownloadPermission", bCanDownload);
            });
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
    
        // Validate that the record has a file
        if (!oContextData.FILE_NAME) {
            MessageBox.error(this._getText("noCsvFileAvailable"));
            return;
        }
    
        // Download PDF from Object Store using backend method
       this._downloadFileFromObjectStore(oContextData);
    },
    
    _downloadFileFromObjectStore: async function (oHistoryRecord) {
        this.showBusy();
    
        try {
            const sUrl = ServiceConfig.getServiceUrl("pdfDownload");
            const oPayload = { FileName: oHistoryRecord.FILE_NAME };
    
            const response = await fetch(sUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "text/plain"
                },
                body: JSON.stringify(oPayload)
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            // Read the Base64 string
            const base64 = await response.text();
            if (!base64 || base64.trim() === "") {
                throw new Error("Empty or invalid file data received");
            }
    
            // Detect file type from filename extension
            const sFileName = oHistoryRecord.FILE_NAME || "download";
            const sFileExtension = sFileName.split('.').pop().toLowerCase();
            let sMimeType = "application/octet-stream"; // Default
            
            // Map common file extensions to MIME types
            const mimeTypeMap = {
                'pdf': 'application/pdf',
                'csv': 'text/csv',
                'txt': 'text/plain',
                'xml': 'application/xml',
                'json': 'application/json',
                'zip': 'application/zip',
                'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'xls': 'application/vnd.ms-excel'
            };
            
            sMimeType = mimeTypeMap[sFileExtension] || sMimeType;
            
            console.log("Downloading file:", sFileName, "Type:", sMimeType);
    
            // Convert Base64 to binary blob
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: sMimeType });
    
            // Trigger browser download
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement("a");
            downloadLink.href = url;
            downloadLink.download = sFileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
    
            MessageToast.show(`File downloaded successfully: ${sFileName}`);
    
        } catch (error) {
            console.error("File download failed:", error);
            MessageBox.error(`File download failed: ${error.message}`);
        } finally {
            this.hideBusy();
        }
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
    
    // =========================================================================
    // Variant Management Methods - ENHANCED IMPLEMENTATION
    // =========================================================================
    
    /**
     * Initialize variant management with saved variants
     * @private
     */
    _initializeVariantManagement: function() {
        const oVariantManagement = this.byId("vm");
        if (!oVariantManagement) {
            console.error("VariantManagement control not found");
            return;
        }
    
        try {
            // Load saved variants from storage
            const aVariants = VariantStorage.getVariants();
            console.log("Loading variants from storage:", aVariants.length, "variants found");
    
            // Clear existing items (except standard)
            oVariantManagement.destroyVariantItems();
    
            // Add Standard variant (always first)
            oVariantManagement.addVariantItem(new VariantItem({
                key: "*standard*",
                text: "Standard"
            }));
    
            // Add saved variants
            aVariants.forEach(oVariant => {
                oVariantManagement.addVariantItem(new VariantItem({
                    key: oVariant.key,
                    text: oVariant.name
                }));
            });
    
            // Set default variant key
            const sDefaultKey = VariantStorage.getDefaultVariant();
            if (sDefaultKey) {
                oVariantManagement.setDefaultVariantKey(sDefaultKey);
            } else {
                oVariantManagement.setDefaultVariantKey("*standard*");
            }
    
            // Set current variant from storage
            const sCurrentKey = VariantStorage.getCurrentVariant();
            if (sCurrentKey && sCurrentKey !== "*standard*") {
                // Verify the variant exists
                const oVariant = VariantStorage.getVariant(sCurrentKey);
                if (oVariant) {
                    oVariantManagement.setCurrentVariantKey(sCurrentKey);
                    // Don't load filters here - will be done in onRouteMatched after filter data is ready
                    this._bNeedToLoadVariantOnStart = true;
                } else {
                    oVariantManagement.setCurrentVariantKey("*standard*");
                }
            } else {
                oVariantManagement.setCurrentVariantKey("*standard*");
            }
            
            console.log("Variant management initialized with", aVariants.length, "variants");
        } catch (error) {
            console.error("Error initializing variant management:", error);
            MessageToast.show("Error loading saved variants");
        }
    },
    
    /**
     * Event handler when a variant is selected
     * @param {sap.ui.base.Event} oEvent - The select event
     */
    onSelectVariant: function(oEvent) {
        const sVariantKey = oEvent.getParameter("key");
        
        console.log("Variant selected:", sVariantKey);
        
        try {
            // Store current selection
            VariantStorage.setCurrentVariant(sVariantKey);
            
            // For standard variant, clear filters
            if (!sVariantKey || sVariantKey === "*standard*") {
                this.clearAllFilters();
                MessageToast.show(this._getText("variantStandardSelected"));
                return;
            }
            
            // Load variant from storage
            const oVariant = VariantStorage.getVariant(sVariantKey);
            
            if (oVariant) {
                this._loadVariantFilters(oVariant);
                MessageToast.show(this._getText("variantLoaded", [oVariant.name]));
            } else {
                console.warn("Variant not found:", sVariantKey);
                MessageBox.warning("The selected variant could not be loaded. It may have been deleted.");
                // Reset to standard
                this.byId("vm").setCurrentVariantKey("*standard*");
                this.clearAllFilters();
            }
        } catch (error) {
            console.error("Error loading variant:", error);
            MessageBox.error("Failed to load variant: " + error.message);
        }
    },
    
    /**
     * Load variant filters into the filter model
     * @private
     * @param {object} oVariant - Variant object
     */
    _loadVariantFilters: function(oVariant) {
        const oFilterModel = this.getView().getModel("filterModel");
        if (!oFilterModel) {
            console.error("Filter model not found");
            return;
        }
    
        // Get filter data from variant (support both 'data' and 'filterData' properties)
        const oFilterData = oVariant.filterData || oVariant.data || {};
        
        // Merge with current dynamic data to preserve dropdown options
        const oCurrentData = oFilterModel.getData();
        const oNewData = {
            // Filter values from variant
            BUKRS: oFilterData.BUKRS || [],
            BELNR: oFilterData.BELNR || [],
            GJAHR: oFilterData.GJAHR || "",
            BLDATFrom: oFilterData.BLDATFrom || "",
            BLDATTo: oFilterData.BLDATTo || "",
            BLDATRange: oFilterData.BLDATRange || "",
            INV_TYPE: oFilterData.INV_TYPE || [],
            AWSYS: oFilterData.AWSYS || [],
            STATUS: oFilterData.STATUS || [],
            KUNNR: oFilterData.KUNNR || [],
            
            // Preserve dynamic data
            invoiceTypes: oCurrentData.invoiceTypes || [],
            originSystems: oCurrentData.originSystems || [],
            companySuggestions: oCurrentData.companySuggestions || []
        };
        
        oFilterModel.setData(oNewData);
        
        // Update MultiInput tokens
        this._updateMultiInputTokensFromData(oFilterData);
        
        // Apply the filters (trigger search)
        this._applyFilters();
    },
    
    /**
     * Event handler when a variant is saved
     * @param {sap.ui.base.Event} oEvent - The save event
     */
    onSaveVariant: function(oEvent) {
        const sVariantName = oEvent.getParameter("name");
        const bOverwrite = oEvent.getParameter("overwrite");
        const bDefault = oEvent.getParameter("def") || false;
        let sVariantKey = oEvent.getParameter("key");
        
        console.log("Saving variant:", sVariantName, "Overwrite:", bOverwrite, "Default:", bDefault);
        
        try {
            // Get current filter values
            const oFilterModel = this.getView().getModel("filterModel");
            if (!oFilterModel) {
                MessageBox.error("Filter model not found");
                return;
            }
            
            const oFilterData = oFilterModel.getData();
            
            // Prepare variant data (exclude dynamic dropdown data)
            const oVariantFilterData = {
                BUKRS: oFilterData.BUKRS || [],
                BELNR: oFilterData.BELNR || [],
                GJAHR: oFilterData.GJAHR || "",
                BLDATFrom: oFilterData.BLDATFrom || "",
                BLDATTo: oFilterData.BLDATTo || "",
                BLDATRange: oFilterData.BLDATRange || "",
                INV_TYPE: oFilterData.INV_TYPE || [],
                AWSYS: oFilterData.AWSYS || [],
                STATUS: oFilterData.STATUS || [],
                KUNNR: oFilterData.KUNNR || []
            };
            
            // Check if variant has at least one filter
            const bHasFilters = this._variantHasFilters(oVariantFilterData);
            if (!bHasFilters) {
                MessageBox.warning(this._getText("noFiltersSetWarning"));
                return;
            }
            
            // Generate key for new variants or use existing key
            if (!bOverwrite || !sVariantKey || sVariantKey === "*standard*") {
                sVariantKey = VariantStorage.generateKey();
            }
            
            // Create variant object
            const oVariant = {
                key: sVariantKey,
                name: sVariantName,
                default: bDefault,
                filterData: oVariantFilterData,
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString()
            };
            
            // Save to storage
            const bSuccess = VariantStorage.saveVariant(oVariant);
            
            if (!bSuccess) {
                MessageBox.error("Failed to save variant");
                return;
            }
            
            // Update VariantManagement control
            const oVariantManagement = this.byId("vm");
            if (oVariantManagement) {
                if (!bOverwrite) {
                    // Add new variant item
                    oVariantManagement.addVariantItem(new VariantItem({
                        key: sVariantKey,
                        text: sVariantName
                    }));
                } else {
                    // Update existing item text if name changed
                    const aItems = oVariantManagement.getVariantItems();
                    const oExistingItem = aItems.find(item => item.getKey() === sVariantKey);
                    if (oExistingItem) {
                        oExistingItem.setText(sVariantName);
                    }
                }
                
                // Update default variant if needed
                if (bDefault) {
                    oVariantManagement.setDefaultVariantKey(sVariantKey);
                }
                
                // Set as selected
                oVariantManagement.setCurrentVariantKey(sVariantKey);
            }
            
            // Store as current
            VariantStorage.setCurrentVariant(sVariantKey);
            
            // Show success message
            MessageToast.show(this._getText("variantSaved", [sVariantName]));
            
            console.log("Variant saved successfully:", sVariantName, sVariantKey);
        } catch (error) {
            console.error("Error saving variant:", error);
            MessageBox.error("Failed to save variant: " + error.message);
        }
    },
    
    /**
     * Check if variant has at least one filter value
     * @private
     * @param {object} oFilterData - Filter data object
     * @returns {boolean} True if has filters
     */
    _variantHasFilters: function(oFilterData) {
        // Check array filters
        const bHasArrayFilters = ["BUKRS", "BELNR", "INV_TYPE", "AWSYS", "STATUS", "KUNNR"]
            .some(sKey => oFilterData[sKey] && oFilterData[sKey].length > 0);
        
        // Check string filters
        const bHasStringFilters = ["GJAHR", "BLDATFrom", "BLDATTo", "BLDATRange"]
            .some(sKey => oFilterData[sKey] && oFilterData[sKey].trim() !== "");
        
        return bHasArrayFilters || bHasStringFilters;
    },
    
    /**
     * Event handler when the manage variants dialog is opened
     * @param {sap.ui.base.Event} oEvent - The manage event  
     */
    onManageVariants: function(oEvent) {
        console.log("Managing variants");
        
        try {
            // Get renamed and deleted variants from event
            const aRenamed = oEvent.getParameter("renamed") || [];
            const aDeleted = oEvent.getParameter("deleted") || [];
            const sDefaultVariantKey = oEvent.getParameter("def");
            
            let iRenamedCount = 0;
            let iDeletedCount = 0;
            
            // Handle renames
            aRenamed.forEach(oRename => {
                const sKey = oRename.key;
                const sNewName = oRename.name;
                const bSuccess = VariantStorage.renameVariant(sKey, sNewName);
                if (bSuccess) {
                    iRenamedCount++;
                    console.log("Renamed variant:", sKey, "to", sNewName);
                }
            });
            
            // Handle deletions
            aDeleted.forEach(sKey => {
                const bSuccess = VariantStorage.deleteVariant(sKey);
                if (bSuccess) {
                    iDeletedCount++;
                    
                    // Remove from control
                    const oVariantManagement = this.byId("vm");
                    if (oVariantManagement) {
                        const aItems = oVariantManagement.getVariantItems();
                        const oItemToRemove = aItems.find(item => item.getKey() === sKey);
                        if (oItemToRemove) {
                            oVariantManagement.removeVariantItem(oItemToRemove);
                        }
                    }
                    console.log("Deleted variant:", sKey);
                }
            });
            
            // Handle default variant change
            if (sDefaultVariantKey) {
                VariantStorage.setDefaultVariant(sDefaultVariantKey);
                const oVariantManagement = this.byId("vm");
                if (oVariantManagement) {
                    oVariantManagement.setDefaultVariantKey(sDefaultVariantKey);
                }
                console.log("Default variant set to:", sDefaultVariantKey);
            }
            
            // Show success message
            if (iRenamedCount > 0 || iDeletedCount > 0) {
                let sMessage = [];
                if (iRenamedCount > 0) {
                    sMessage.push(`${iRenamedCount} variant(s) renamed`);
                }
                if (iDeletedCount > 0) {
                    sMessage.push(`${iDeletedCount} variant(s) deleted`);
                }
                MessageToast.show(sMessage.join(", "));
            }
            
            console.log("Variants renamed:", iRenamedCount, "deleted:", iDeletedCount);
        } catch (error) {
            console.error("Error managing variants:", error);
            MessageBox.error("Failed to update variants: " + error.message);
        }
    },
    
    /**
     * Helper method to update MultiInput tokens from variant data
     * @private
     * @param {object} oFilterData - The filter data object
     */
    _updateMultiInputTokensFromData: function(oFilterData) {
        // Update BUKRS MultiInput
        const oBUKRSInput = this.byId("multiInput1");
        if (oBUKRSInput && oFilterData.BUKRS) {
            oBUKRSInput.removeAllTokens();
            oFilterData.BUKRS.forEach(sValue => {
                oBUKRSInput.addToken(new Token({ text: sValue, key: sValue }));
            });
        }
        
        // Update BELNR MultiInput
        const oBELNRInput = this.byId("multiInput2");
        if (oBELNRInput && oFilterData.BELNR) {
            oBELNRInput.removeAllTokens();
            oFilterData.BELNR.forEach(sValue => {
                oBELNRInput.addToken(new Token({ text: sValue, key: sValue }));
            });
        }
        
        // Update KUNNR MultiInput
        const oKUNNRInput = this.byId("multiInput3");
        if (oKUNNRInput && oFilterData.KUNNR) {
            oKUNNRInput.removeAllTokens();
            oFilterData.KUNNR.forEach(sValue => {
                oKUNNRInput.addToken(new Token({ text: sValue, key: sValue }));
            });
        }
    },
    
    // =========================================================================
    // End of Variant Management Methods
    // =========================================================================
    
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
            this._loadInvoiceTypes(),
            this._loadOriginSystems(),
            this._loadCompanyData()
        ];
    
        return Promise.all(aPromises).catch(error => {
            console.error("Error loading filter data:", error);
            MessageToast.show("Failed to load filter options");
        });
    },
    
    // Load Invoice Type options from EINV_INVOICE_CODE entity
    _loadInvoiceTypes: function() {
        return fetch(ServiceConfig.getServiceUrl("invoiceCode"))
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.value) {
                    // Create a Set to store unique combinations of INV_TYPE and INV_TYPE_TEXT
                    const uniqueCombinations = new Set();
                    const aInvoiceTypes = [];
    
                    data.value.forEach(item => {
                        if (item.INV_TYPE && item.INV_TYPE_TEXT) {
                            const combination = `${item.INV_TYPE}|${item.INV_TYPE_TEXT}`;
    
                            // Only add if this combination hasn't been seen before
                            if (!uniqueCombinations.has(combination)) {
                                uniqueCombinations.add(combination);
                                aInvoiceTypes.push({
                                    key: item.INV_TYPE,
                                    text: `${item.INV_TYPE} - ${item.INV_TYPE_TEXT}`
                                });
                            }
                        }
                    });
    
                    // Store in filter model
                    const oFilterModel = this.getView().getModel("filterModel");
                    if (oFilterModel) {
                        oFilterModel.setProperty("/invoiceTypes", aInvoiceTypes);
                    }
    
                    console.log("Loaded unique invoice types:", aInvoiceTypes);
                }
            })
            .catch(error => {
                console.error("Error loading invoice types:", error);
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
                    // Extract unique AWSYS values from the array
                    const aUniqueAwsys = [...new Set(data.value.map(item => item.AWSYS).filter(awsys => awsys))];
    
                    // Create filter options with unique AWSYS values
                    const aOriginSystems = aUniqueAwsys.map(awsys => ({
                        key: awsys,
                        text: awsys
                    }));
    
                    // Store in filter model
                    const oFilterModel = this.getView().getModel("filterModel");
                    if (oFilterModel) {
                        oFilterModel.setProperty("/originSystems", aOriginSystems);
                    }
    
                    console.log("Loaded unique origin systems:", aOriginSystems);
                }
            })
            .catch(error => {
                console.error("Error loading origin systems:", error);
            });
    },
    
    // Load Company data from EINV_COMPANY_MASTER_DATA entity
    _loadCompanyData: function() {
        return fetch(ServiceConfig.getServiceUrl("companyMaster"))
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.value) {
                    // Create a Map to store unique companies by BUKRS code
                    const uniqueCompanies = new Map();
    
                    data.value.forEach(item => {
                        const sBukrs = item.BUKRS;
    
                        if (sBukrs && !uniqueCompanies.has(sBukrs)) {
                            // Keep all original data and add UI-specific properties
                            uniqueCompanies.set(sBukrs, {
                                // UI-specific properties for MultiInput
                                key: sBukrs, // Company Code (BUKRS)
                                text: sBukrs, // Company Code (for display)
                                additionalText: item.FLOW_DESCRIPTION || "", // Flow Description (e.g., "Belgium")
    
                                // Keep all original data fields
                                ...item
                            });
                        }
                    });
    
                    // Convert Map values to array
                    const aCompanySuggestions = Array.from(uniqueCompanies.values());
    
                    // Store in filter model
                    const oFilterModel = this.getView().getModel("filterModel");
                    if (oFilterModel) {
                        oFilterModel.setProperty("/companySuggestions", aCompanySuggestions);
                    }
                }
            })
            .catch(error => {
                console.error("Error loading company data:", error);
            });
    },
    
    // Load document data from OData service into app model with optional filters
    _loadDocumentData: function(sQueryParams = '') {
        const oAppModel = this.getView().getModel("app");
        if (!oAppModel) {
            return;
        }
    
        // Add $top=50 to limit results and $expand for documentHistories
        let sFullQueryParams = sQueryParams;
        const sLimitParams = '$top=50&$expand=documentHistories';
        
        if (sFullQueryParams) {
            sFullQueryParams += '&' + sLimitParams;
        } else {
            sFullQueryParams = sLimitParams;
        }
    
        const sUrl = ServiceConfig.getServiceUrl("documentList", sFullQueryParams);
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
                    oAppModel.setProperty("/rows", data.value);
                    const iCount = data.value.length;
                    MessageToast.show(`Loaded ${iCount} documents`);
                } else {
                    oAppModel.setProperty("/rows", []);
                    MessageToast.show("No documents found");
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