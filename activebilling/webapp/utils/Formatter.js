sap.ui.define([
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Filter",
    "sap/ui/core/format/NumberFormat", 
    "sap/gantt/misc/Format",
    "sap/ui/core/format/DateFormat"
], function (FilterOperator, Filter, NumberFormat, Format, DateFormat) {
    "use strict";
    
    var Formatter = {
		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
		 

        formatIcon: function(string) {
            if (string === 'OK') {
                return "sap-icon://accept";
            } else if (string === 'KO') {
                return "sap-icon://present";
            } else {
                return "";
            }
        },
        
        formatCurrency: function (nImport) {
            var oFormat = NumberFormat.getCurrencyInstance({
                currencyCode: false,
                customCurrencies: {
                    "EUR": {
                        isoCode: "EUR",
                        symbol: "€",
                        decimals: 2
                    }
                }
            });
        
            // Fallback per null, undefined o NaN
            if (!nImport || isNaN(nImport)) {
                return oFormat.format(0, "EUR");
            }
        
            // Forza il valore in numero se arriva come stringa
            var fValue = typeof nImport === "number" ? nImport : parseFloat(nImport);
        
            return oFormat.format(fValue, "EUR");
        },
        
        formatDate: function (oDate) {
            if (!oDate) {
                return "";
            }
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern: "dd/MM/yyyy"});
            return oDateFormat.format(new Date(oDate));
        },

        formatDataAnno: function (sData) {
            if (!sData) {
              return "";
            }
      
            const oDate = new Date(sData);
            if (isNaN(oDate)) {
              return "";
            }
      
            const oFormatter = DateFormat.getDateInstance({
              pattern: "MMMM yyyy",
              calendarType: sap.ui.core.CalendarType.Gregorian
            });
      
            return oFormatter.format(oDate); 
        },

        normalizeToStandardDate: function(sDate) {
            if (!sDate || typeof sDate !== "string") {
                return null;
            }
        
            // Case 1: Already in format yyyy-MM-dd (e.g., "2024-12-25")
            const isoMatch = sDate.match(/^(\d{4})-(\d{2})-\d{2}$/);
            if (isoMatch) {
                const year = isoMatch[1];
                const month = isoMatch[2];
                return `${year}-${month}-01`;
            }
        
            // Case 2: Localized month name + year (e.g., "dicembre 2016" or "december 2016")
            const months = {
                // Italian
                "gennaio": "01", "febbraio": "02", "marzo": "03", "aprile": "04",
                "maggio": "05", "giugno": "06", "luglio": "07", "agosto": "08",
                "settembre": "09", "ottobre": "10", "novembre": "11", "dicembre": "12",
        
                // English
                "january": "01", "february": "02", "march": "03", "april": "04",
                "may": "05", "june": "06", "july": "07", "august": "08",
                "september": "09", "october": "10", "november": "11", "december": "12"
            };
        
            const parts = sDate.toLowerCase().split(" ");
            if (parts.length === 2 && months[parts[0]] && /^\d{4}$/.test(parts[1])) {
                const month = months[parts[0]];
                const year = parts[1];
                return `${year}-${month}-01`;
            }
        
            // Invalid format
            return null;
        },

        formatDateToDMY: function (sDate) {
            if (!sDate) return "";
            const oDate = new Date(sDate);
            const day = String(oDate.getDate()).padStart(2, "0");
            const month = String(oDate.getMonth() + 1).padStart(2, "0");
            const year = oDate.getFullYear();
            return `${day}/${month}/${year}`;
        },

        // Format a date string in the form yyyy-MM-dd to dd-MM-yyyy without timezone shifts
        formatIsoToDMYDash: function(sDate) {
            if (!sDate || typeof sDate !== "string") { return ""; }
            var m = sDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!m) { return ""; }
            return m[3] + "-" + m[2] + "-" + m[1];
        },

        // Pass-through for HH:mm:ss strings, ensuring empty when falsy
        formatTimeString: function(sTime) {
            if (!sTime || typeof sTime !== "string") { return ""; }
            return sTime;
        },

        formatHourOutOfTimestamp: function (sTimestamp) {
            const date = new Date(sTimestamp);
            const formattedHour = date.toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            });
            return formattedHour;
        },


        formatTime: function(ms) {
            // Calculate total hours
            const totalHours = Math.floor(ms / (1000 * 60 * 60)).toString().padStart(2, "0");
            
            // Calculate remaining minutes after extracting hours
            const totalMinutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
            
            return totalHours + ":" + totalMinutes;
        },

        statusToColor: function(status) {
            switch (status) {
                case "00":
                    return "btnStatus00";
                case "01":
                    return "btnStatus01";
                case "02":
                    return "btnStatus02";
                case "03":
                    return "btnStatus03";
                case "04":
                    return "btnStatus04";
            }
        },

        formatStatus: function(status) {
            if (!status) return "";
            
            const statusMap = {
                "01": "NEW",
                "02": "WAIT", 
                "03": "SENT",
                "04": "CANC",
                "05": "BTP_ERR",
                "06": "DT_ERR",
                "07": "RESEND",
                "08": "COMPLETED",
                "09": "COMM_ERR"
            };
            
            return statusMap[status] || status;
        },

        formatAckCode: function(sAckCode) {
            if (!sAckCode) return "";
            
            const codeMap = {
                "1": "Rifiuto da DT",
                "2": "Accettazione da DT",
                "3": "Acquisizione DT",
                "4": "Conservazione DT",
                "5": "Scarto documento DT",
                "6": "Ricevuta consegna Governo",
                "7": "Scarto Tecnico Governo",
                "8": "Ricevuta consegna Governo"
            };
            
            return codeMap[sAckCode] || sAckCode;
        },

        getMostRecentAckCode: function(aDocumentHistories) {
            if (!aDocumentHistories || !Array.isArray(aDocumentHistories) || aDocumentHistories.length === 0) {
                return "";
            }

            // Find entry with the most recent ACK_DATE
            const oMostRecent = aDocumentHistories.reduce((latest, current) => {
                if (!latest) return current;
                
                const latestDate = latest.ACK_DATE ? new Date(latest.ACK_DATE) : new Date(0);
                const currentDate = current.ACK_DATE ? new Date(current.ACK_DATE) : new Date(0);
                
                return currentDate > latestDate ? current : latest;
            }, null);

            return oMostRecent && oMostRecent.ACK_CODE ? oMostRecent.ACK_CODE : "";
        },

        getMostRecentAckDescription: function(aDocumentHistories) {
            // Reuse getMostRecentAckCode to get the code, then format it
            const sAckCode = Formatter.getMostRecentAckCode(aDocumentHistories);
            return Formatter.formatAckCode(sAckCode);
        }
    };
    
    return Formatter;

});
