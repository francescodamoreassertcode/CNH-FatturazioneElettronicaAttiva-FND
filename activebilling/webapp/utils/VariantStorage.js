sap.ui.define([
    "cnh/ab/activebilling/model/VariantEntity"
], function(VariantEntity) {
    "use strict";

    /**
     * VariantStorage - Handles variant persistence using browser local storage
     * Enhanced version with better error handling and entity management
     */
    return {
        
        STORAGE_KEY: "activeBilling.filterVariants",
        CURRENT_VARIANT_KEY: "activeBilling.currentVariant",
        DEFAULT_VARIANT_KEY: "activeBilling.defaultVariant",

        /**
         * Get all saved variants
         * @returns {Array} Array of variant objects
         */
        getVariants: function() {
            try {
                const sVariants = localStorage.getItem(this.STORAGE_KEY);
                if (sVariants) {
                    const aVariants = JSON.parse(sVariants);
                    // Ensure all variants have required fields
                    return aVariants.map(v => this._ensureValidVariant(v));
                }
            } catch (e) {
                console.error("Error parsing variants from localStorage:", e);
                // Try to recover by clearing corrupted data
                this._handleStorageError();
            }
            return [];
        },

        /**
         * Ensure variant has all required fields
         * @private
         * @param {object} oVariant - Variant object
         * @returns {object} Validated variant
         */
        _ensureValidVariant: function(oVariant) {
            return {
                key: oVariant.key || this.generateKey(),
                name: oVariant.name || "Unnamed Variant",
                default: oVariant.default || false,
                filterData: oVariant.filterData || oVariant.data || {},
                createdAt: oVariant.createdAt || new Date().toISOString(),
                modifiedAt: oVariant.modifiedAt || new Date().toISOString()
            };
        },

        /**
         * Handle storage errors by clearing corrupted data
         * @private
         */
        _handleStorageError: function() {
            console.warn("Clearing corrupted variant storage");
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.CURRENT_VARIANT_KEY);
            localStorage.removeItem(this.DEFAULT_VARIANT_KEY);
        },

        /**
         * Save a variant
         * @param {object} oVariant - Variant object with key, name, and filterData
         * @returns {boolean} Success flag
         */
        saveVariant: function(oVariant) {
            try {
                const aVariants = this.getVariants();
                const iIndex = aVariants.findIndex(v => v.key === oVariant.key);
                
                // Ensure variant has modification timestamp
                const oVariantToSave = Object.assign({}, oVariant, {
                    modifiedAt: new Date().toISOString()
                });
                
                if (iIndex >= 0) {
                    // Update existing variant - preserve creation date
                    oVariantToSave.createdAt = aVariants[iIndex].createdAt;
                    aVariants[iIndex] = oVariantToSave;
                    console.log("Variant updated:", oVariant.name);
                } else {
                    // Add new variant
                    oVariantToSave.createdAt = new Date().toISOString();
                    aVariants.push(oVariantToSave);
                    console.log("Variant created:", oVariant.name);
                }
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(aVariants));
                
                // If marked as default, update default variant key
                if (oVariantToSave.default) {
                    this.setDefaultVariant(oVariantToSave.key);
                }
                
                return true;
            } catch (e) {
                console.error("Error saving variant:", e);
                return false;
            }
        },

        /**
         * Get a specific variant by key
         * @param {string} sKey - Variant key
         * @returns {object|null} Variant object or null
         */
        getVariant: function(sKey) {
            if (!sKey || sKey === "*standard*") {
                return null;
            }
            const aVariants = this.getVariants();
            return aVariants.find(v => v.key === sKey) || null;
        },

        /**
         * Get variant as VariantEntity
         * @param {string} sKey - Variant key
         * @returns {cnh.ab.activebilling.model.VariantEntity|null} VariantEntity or null
         */
        getVariantEntity: function(sKey) {
            const oVariant = this.getVariant(sKey);
            if (oVariant) {
                return new VariantEntity(oVariant);
            }
            return null;
        },

        /**
         * Delete a variant
         * @param {string} sKey - Variant key to delete
         * @returns {boolean} Success flag
         */
        deleteVariant: function(sKey) {
            try {
                let aVariants = this.getVariants();
                const oVariant = aVariants.find(v => v.key === sKey);
                
                aVariants = aVariants.filter(v => v.key !== sKey);
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(aVariants));
                
                // If deleted variant was current, clear current variant
                if (this.getCurrentVariant() === sKey) {
                    this.setCurrentVariant("*standard*");
                }
                
                // If deleted variant was default, clear default variant
                if (this.getDefaultVariant() === sKey) {
                    this.setDefaultVariant(null);
                }
                
                console.log("Variant deleted:", oVariant ? oVariant.name : sKey);
                return true;
            } catch (e) {
                console.error("Error deleting variant:", e);
                return false;
            }
        },

        /**
         * Rename a variant
         * @param {string} sKey - Variant key
         * @param {string} sNewName - New name
         * @returns {boolean} Success flag
         */
        renameVariant: function(sKey, sNewName) {
            const oVariant = this.getVariant(sKey);
            if (oVariant) {
                oVariant.name = sNewName;
                return this.saveVariant(oVariant);
            }
            return false;
        },

        /**
         * Set current variant
         * @param {string} sKey - Variant key
         */
        setCurrentVariant: function(sKey) {
            localStorage.setItem(this.CURRENT_VARIANT_KEY, sKey || "*standard*");
        },

        /**
         * Get current variant key
         * @returns {string} Current variant key (defaults to "*standard*")
         */
        getCurrentVariant: function() {
            return localStorage.getItem(this.CURRENT_VARIANT_KEY) || "*standard*";
        },

        /**
         * Set default variant
         * @param {string} sKey - Variant key to set as default
         */
        setDefaultVariant: function(sKey) {
            // First, clear default flag from all other variants
            const aVariants = this.getVariants();
            aVariants.forEach(v => {
                if (v.key !== sKey) {
                    v.default = false;
                }
            });
            
            // Set the new default
            if (sKey && sKey !== "*standard*") {
                const oVariant = aVariants.find(v => v.key === sKey);
                if (oVariant) {
                    oVariant.default = true;
                }
            }
            
            // Save all variants
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(aVariants));
            localStorage.setItem(this.DEFAULT_VARIANT_KEY, sKey || "");
        },

        /**
         * Get default variant key
         * @returns {string|null} Default variant key
         */
        getDefaultVariant: function() {
            const sKey = localStorage.getItem(this.DEFAULT_VARIANT_KEY);
            if (sKey && sKey !== "*standard*") {
                // Verify the variant still exists
                const oVariant = this.getVariant(sKey);
                if (oVariant) {
                    return sKey;
                }
            }
            return null;
        },

        /**
         * Check if variant name already exists
         * @param {string} sName - Variant name to check
         * @param {string} sExcludeKey - Key to exclude from check (for rename)
         * @returns {boolean} True if name exists
         */
        variantNameExists: function(sName, sExcludeKey) {
            const aVariants = this.getVariants();
            return aVariants.some(v => 
                v.name.toLowerCase() === sName.toLowerCase() && 
                v.key !== sExcludeKey
            );
        },

        /**
         * Generate unique variant key
         * @returns {string} Unique key
         */
        generateKey: function() {
            return "variant_" + new Date().getTime() + "_" + Math.random().toString(36).substr(2, 9);
        },

        /**
         * Export all variants as JSON
         * @returns {string} JSON string of all variants
         */
        exportVariants: function() {
            return JSON.stringify(this.getVariants(), null, 2);
        },

        /**
         * Import variants from JSON
         * @param {string} sJson - JSON string of variants
         * @returns {boolean} Success flag
         */
        importVariants: function(sJson) {
            try {
                const aVariants = JSON.parse(sJson);
                if (Array.isArray(aVariants)) {
                    localStorage.setItem(this.STORAGE_KEY, sJson);
                    console.log("Imported", aVariants.length, "variants");
                    return true;
                }
            } catch (e) {
                console.error("Error importing variants:", e);
            }
            return false;
        },

        /**
         * Clear all variants (for testing/cleanup)
         */
        clearAll: function() {
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.CURRENT_VARIANT_KEY);
            localStorage.removeItem(this.DEFAULT_VARIANT_KEY);
            console.log("All variants cleared");
        },

        /**
         * Get storage statistics
         * @returns {object} Storage statistics
         */
        getStats: function() {
            const aVariants = this.getVariants();
            const sCurrentKey = this.getCurrentVariant();
            const sDefaultKey = this.getDefaultVariant();
            
            return {
                totalVariants: aVariants.length,
                currentVariantKey: sCurrentKey,
                defaultVariantKey: sDefaultKey,
                storageUsed: JSON.stringify(aVariants).length,
                variants: aVariants.map(v => ({
                    key: v.key,
                    name: v.name,
                    default: v.default,
                    createdAt: v.createdAt,
                    modifiedAt: v.modifiedAt
                }))
            };
        }
    };
});


