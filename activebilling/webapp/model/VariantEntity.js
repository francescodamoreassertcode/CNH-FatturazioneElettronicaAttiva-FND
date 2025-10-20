sap.ui.define([
    "sap/ui/base/Object"
], function(BaseObject) {
    "use strict";

    /**
     * VariantEntity - Entity class for managing filter variants
     * Similar to the first webapp but simplified for local storage
     */
    return BaseObject.extend("cnh.ab.activebilling.model.VariantEntity", {

        /**
         * Constructor
         * @param {object} mSettings - Initial settings
         */
        constructor: function(mSettings) {
            BaseObject.apply(this, arguments);
            this._data = mSettings || this._getDefaultData();
        },

        /**
         * Get default variant data
         * @returns {object} Default data structure
         */
        _getDefaultData: function() {
            return {
                key: "",
                name: "Standard",
                default: false,
                filterData: {
                    BUKRS: [],
                    BELNR: [],
                    GJAHR: "",
                    BLDATFrom: "",
                    BLDATTo: "",
                    BLDATRange: "",
                    INV_TYPE: [],
                    AWSYS: [],
                    STATUS: [],
                    KUNNR: []
                },
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString()
            };
        },

        /**
         * Get variant key
         * @returns {string} Variant key
         */
        getKey: function() {
            return this._data.key;
        },

        /**
         * Set variant key
         * @param {string} sKey - Variant key
         */
        setKey: function(sKey) {
            this._data.key = sKey;
        },

        /**
         * Get variant name
         * @returns {string} Variant name
         */
        getName: function() {
            return this._data.name;
        },

        /**
         * Set variant name
         * @param {string} sName - Variant name
         */
        setName: function(sName) {
            this._data.name = sName;
            this._data.modifiedAt = new Date().toISOString();
        },

        /**
         * Get default flag
         * @returns {boolean} Is default variant
         */
        getDefault: function() {
            return this._data.default || false;
        },

        /**
         * Set default flag
         * @param {boolean} bDefault - Is default variant
         */
        setDefault: function(bDefault) {
            this._data.default = bDefault;
        },

        /**
         * Get filter data
         * @returns {object} Filter data
         */
        getFilterData: function() {
            return this._data.filterData;
        },

        /**
         * Set filter data
         * @param {object} oData - Filter data
         */
        setFilterData: function(oData) {
            this._data.filterData = oData;
            this._data.modifiedAt = new Date().toISOString();
        },

        /**
         * Get complete data
         * @returns {object} Complete variant data
         */
        getData: function() {
            return this._data;
        },

        /**
         * Set complete data
         * @param {object} oData - Complete variant data
         */
        setData: function(oData) {
            this._data = Object.assign({}, this._getDefaultData(), oData);
        },

        /**
         * Clone this entity
         * @returns {cnh.ab.activebilling.model.VariantEntity} Cloned entity
         */
        clone: function() {
            const oClonedData = JSON.parse(JSON.stringify(this._data));
            return new cnh.ab.activebilling.model.VariantEntity(oClonedData);
        },

        /**
         * Validate variant data
         * @returns {object} Validation result {valid: boolean, errors: array}
         */
        validate: function() {
            const aErrors = [];

            if (!this._data.name || this._data.name.trim() === "") {
                aErrors.push("Variant name is required");
            }

            if (this._data.name.length > 50) {
                aErrors.push("Variant name must not exceed 50 characters");
            }

            return {
                valid: aErrors.length === 0,
                errors: aErrors
            };
        },

        /**
         * Check if variant has filter values
         * @returns {boolean} True if variant has at least one filter value
         */
        hasFilters: function() {
            const oFilterData = this._data.filterData;
            
            // Check array filters
            const bHasArrayFilters = ["BUKRS", "BELNR", "INV_TYPE", "AWSYS", "STATUS", "KUNNR"]
                .some(sKey => oFilterData[sKey] && oFilterData[sKey].length > 0);
            
            // Check string filters
            const bHasStringFilters = ["GJAHR", "BLDATFrom", "BLDATTo", "BLDATRange"]
                .some(sKey => oFilterData[sKey] && oFilterData[sKey].trim() !== "");
            
            return bHasArrayFilters || bHasStringFilters;
        }
    });
});

