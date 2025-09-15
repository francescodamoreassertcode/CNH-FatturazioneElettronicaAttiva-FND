/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["cnh/ab/activebilling/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
