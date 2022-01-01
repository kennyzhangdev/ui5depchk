sap.ui.define(
  [
    "jquery.sap.global",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/viz/ui5/format/ChartFormatter",
    "sap/viz/ui5/api/env/Format",
    "sap/ui/model/Filter",
    "sap/ui/core/format/DateFormat",
    "../model/formatter",
    "../model/models",
    "sap/m/MessageToast",
    "sap/suite/ui/commons/ChartContainerContent",
    "sap/ui/app",
    "sap/ui/model/odata/ODataModel",
    "sap/ui/table/Table"
  ],
  function (
    jQuery,
    Controller,
    JSONModel,
    ChartFormatter,
    Format,
    Filter,
    DateFormat,
    formatter,
    models,
    MessageToast,
    ChartContainerContent,
    App,
    ODataModel,
    Table
  ) {
    "use strict";

    return Controller.extend("sd.ModelMonthSales.controller.Root", {
      formatter: formatter,
      _rootPath: jQuery.sap.getModulePath("sd.ModelMonthSales"),

      onInit: function () {
        var oTestTable = (this._oTestTable3 = new Table());
        var oTest2Table = oTestTable;
        var oTestTable4 = (this._oTestTable5 = new sap.ui.table.Table());
        this.oTestTable5 = this._oTestTable6 = new Table();

        var oDateFormat = DateFormat.getDateTimeInstance({
          pattern: "yyyyMMdd"
        });

        this.testTable2 = new Table();
        this.aLastYearMonth = [];
        this.aCurrentYearMonth = [];
        jQuery.sap.log.debug("test");
        sap.m.MessageToast.show("test");
        var oModel = new ODataModel();
        this._oModel2 = new ODataModel();
        var oModel3 = new sap.ui.model.odata.ODataModel();
        var sNavMode = oTestTable.getNavigationMode();
        var iSelectedIndex = oTestTable.getSelectedIndex();

        var iTest2 = this._oTestTable3.getSelectedIndex();
        this.aFullYearMonth = [];
        this.getView().setModel(new JSONModel(), "salesModel");
        this._oResourceBundle = this.getOwnerComponent()
          .getModel("i18n")
          .getResourceBundle();
        var oMonthPicker = this.byId("oMonthPicker");
        oMonthPicker.setMaxDate(new Date());
        oMonthPicker.setDateValue(oMonthPicker.getMaxDate());
      },

      /**
       * generate Viz content
       * @param {String}sFragmentKey fragment key
       * @returns {Object}  table content
       */
      generateVizContent: function (sFragmentKey) {
        var oVizColumnTable = sap.ui.xmlfragment(
          "sd.ModelMonthSales.view.fragment." + sFragmentKey,
          this
        );
        oVizColumnTable.setModel(
          this.getView().getModel("salesModel"),
          "salesModel"
        );
        oVizColumnTable.setModel(
          this.getOwnerComponent().getModel("i18n"),
          "i18n"
        );
        return new ChartContainerContent({
          content: oVizColumnTable
        });
      },

      /**
       * set contaniner content to Viz chart;
       */
      initialVizContents: function () {
        for (var key in this._aVizContainers) {
          if (
            this._aVizContainers[
              key
            ].oVizFrameContainer.getSelectedContent() ===
            this._aVizContainers[key].oVizTableContent
          ) {
            this._aVizContainers[key].oIcon.setSrc("sap-icon://table-view");
            this._aVizContainers[key].oVizFrameContainer.switchChart(
              this._aVizContainers[key].oVizChartContent
            );
          }
        }
      },
      /**
       * get data from backend and filter by start date and end date
       */
      getData: function () {
        var that = this;
        this.initialVizContents();
        var dYearMonth = this.byId("oMonthPicker").getDateValue();
        var sYearMonth = this.formatDateString(dYearMonth, "MM.yyyy");
        var dLastYearMonth = new Date(
          dYearMonth.getFullYear(),
          dYearMonth.getMonth() - 1,
          1
        );
        var sYearTitle, sYoYTitle;
        var oTest;
        oTest = new Table();

        if (dYearMonth.getMonth() !== 1) {
          sYearTitle =
            this.formatDateString(dYearMonth, "yyyy年M月") +
            this._getI18NText("modelMonthTitle");
          sYoYTitle =
            this.formatDateString(dLastYearMonth, "yyyy年1-M月") +
            this._getI18NText("modelYoYTitle");
        } else if (dYearMonth.getMonth() === 1) {
          sYearTitle =
            this.formatDateString(dYearMonth, "yyyy年M月") +
            this._getI18NText("modelMonthTitle");
          sYoYTitle =
            this.formatDateString(dLastYearMonth, "yyyy年1月") +
            this._getI18NText("modelYoYTitle");
        }

        var aCommonFilters = [];
        if (this.byId("companyFilter").getSelectedItems().length > 0) {
          aCommonFilters.push(
            this._generateMultiComboBoxFilters(
              this.byId("companyFilter").getSelectedItems(),
              "A0SALESORG"
            )
          );
        }
        if (this.byId("vehicleTypeFilter").getSelectedItems().length > 0) {
          aCommonFilters.push(
            this._generateMultiComboBoxFilters(
              this.byId("vehicleTypeFilter").getSelectedItems(),
              "A0MATERIAL"
            )
          );
        }

        var aYearSalesFilter = [new Filter("A0CALMONTH", "EQ", sYearMonth)];

        this.getOwnerComponent()
          .getModel("monthCustomerModel")
          .read("/ZSDCRResults", {
            filters: [
              new Filter({
                filters: aYearSalesFilter.concat(aCommonFilters),
                and: true
              })
            ],
            success: function (oResponse) {
              that
                .getView()
                .getModel("salesModel")
                .setProperty("/salesOriginData", oResponse.results);
              var aVizData = (that._VizData = that._generateYearVizData(
                oResponse.results
              ));
              that
                .getView()
                .getModel("salesModel")
                .setProperty("/originVizData", aVizData);
              that.filterVizData();
              that
                .getView()
                .byId("idVizFrameSales")
                .setVizProperties({
                  title: {
                    visible: true,
                    text: sYearTitle
                  }
                });
            },
            error: function (error) {
              that._onODataError(error);
            }
          });

        var aMonthRange = this.getMonthRange(dYearMonth);
        var aYoYFilter = [];
        aMonthRange.forEach(function (dDate) {
          aYoYFilter.push(
            new Filter(
              "A0CALMONTH",
              "EQ",
              that.formatDateString(dDate, "MM.yyyy")
            )
          );
        });
        var oYoYFilter = [
          new Filter({
            filters: aYoYFilter,
            and: false
          })
        ];

        this.getOwnerComponent()
          .getModel("yoyCustomerModel")
          .read("/ZSDCRResults", {
            filters: [
              new Filter({
                filters: oYoYFilter.concat(aCommonFilters),
                and: true
              })
            ],
            success: function (oResponse) {
              that
                .getView()
                .byId("idVizFrameYear")
                .setVizProperties({
                  title: {
                    visible: true,
                    text: sYoYTitle
                  }
                });
              that
                .getView()
                .getModel("salesModel")
                .setProperty("/yoyOriginData", oResponse.results);
              that
                .getView()
                .getModel("salesModel")
                .setProperty(
                  "/yoyVizData",
                  that._generateSalesVizData(oResponse.results)
                );
            },
            error: function (error) {
              that._onODataError(error);
            }
          });

        var aModelYoYFilter = [];
        this.aCurrentYearMonth.forEach(function (sMonth) {
          aModelYoYFilter.push(new Filter("A0CALMONTH", "EQ", sMonth));
        });
        aModelYoYFilter.push(new Filter("A0CALMONTH", "EQ", sYearMonth));
        var oModelYoYFilter = [
          new Filter({
            filters: aModelYoYFilter,
            and: false
          })
        ];
        this.getOwnerComponent()
          .getModel("ratioModel")
          .read("/ZSDCRResults", {
            filters: [
              new Filter({
                filters: oModelYoYFilter.concat(aCommonFilters),
                and: true
              })
            ],
            success: function (oResponse) {
              that
                .getView()
                .byId("idVizFrameCurrentMonth")
                .setVizProperties({
                  title: {
                    visible: true,
                    text:
                      that.formatDateString(dYearMonth, "yyyy年M月") +
                      that._getI18NText("ratioTitle")
                  }
                });
              var sPattern =
                dYearMonth.getMonth() === 1 ? "yyyy年1月" : "yyyy年1-M月";
              that
                .getView()
                .byId("idVizFrameYoYPie")
                .setVizProperties({
                  title: {
                    visible: true,
                    text:
                      that.formatDateString(dLastYearMonth, sPattern) +
                      that._getI18NText("ratioTitle")
                  }
                });
              that
                .getView()
                .getModel("salesModel")
                .setProperty("/pieRatioData", oResponse.results);
              that
                .getView()
                .getModel("salesModel")
                .setProperty(
                  "/pieVizData",
                  that._generatePieVizData(oResponse.results)
                );
            },
            error: function (error) {
              that._onODataError(error);
            }
          });
      },

      /**
       * get months of this year and last year for filters
       *
       * @param {Object} dSelectedDate selectedDate
       * @returns {Array} aMonths   month arrays.
       */
      getMonthRange: function (dSelectedDate) {
        var sMonth = dSelectedDate.getMonth();
        var sYear = dSelectedDate.getFullYear();
        var aMonths = [];
        this.aLastYearMonth = [];
        this.aCurrentYearMonth = [];
        this.aFullYearMonth = [];
        if (sMonth === 0) {
          for (var k = 11; k >= 0; k--) {
            aMonths.push(new Date(sYear, k));
            aMonths.push(new Date(sYear - 1, k));
            aMonths.push(new Date(sYear - 2, k));
            this.aFullYearMonth.push(
              this.formatDateString(new Date(sYear, k), "MM.yyyy")
            );
            this.aCurrentYearMonth.push(
              this.formatDateString(new Date(sYear - 1, k), "MM.yyyy")
            );
            this.aLastYearMonth.push(
              this.formatDateString(new Date(sYear - 2, k), "MM.yyyy")
            );
          }
        } else {
          for (var i = sMonth - 1; i >= 0; i--) {
            aMonths.push(new Date(sYear - 1, i));
            this.aLastYearMonth.push(
              this.formatDateString(new Date(sYear - 1, i), "MM.yyyy")
            );
            this.aCurrentYearMonth.push(
              this.formatDateString(new Date(sYear, i), "MM.yyyy")
            );
          }
          for (var j = 11; j >= 0; j--) {
            aMonths.push(new Date(sYear, j));
            this.aFullYearMonth.push(
              this.formatDateString(new Date(sYear, j), "MM.yyyy")
            );
          }
        }
        return aMonths;
      },

      /**
       * format date type for display
       *
       * @param {Object} dDate  date object
       * @param {String} sFormat format pattern
       * @returns {String}  formatted date object.
       */
      formatDateString: function (dDate, sFormat) {
        var oDateFormat = DateFormat.getDateTimeInstance({
          pattern: sFormat
        });
        return oDateFormat.format(dDate);
      },

      /**
       * handler for searchButton press event
       *
       */
      onSearchButtonPress: function () {
        if (this.byId("companyFilter").getSelectedKeys().length === 0) {
          this.byId("companyFilter").setValueState("Error");
        }
        if (this.byId("companyFilter").getValueState() === "Error") {
          MessageToast.show(this._getI18NText("errorMsg"));
        } else {
          this._collapsePanel();
          this.getData();
        }
      },

      /**
       *generate filters based on multi items.
       *
       * @param {Array} aSelectedItems selected items of multiComboBox/multiInput
       * @param {String} sKey  filter field
       * @returns {Object}sap.m.filter
       */
      _generateMultiComboBoxFilters: function (aSelectedItems, sKey) {
        var aFilters = [];
        for (var i = 0; i < aSelectedItems.length; i++) {
          aFilters.push(new Filter(sKey, "EQ", aSelectedItems[i].getKey()));
        }
        return new Filter({
          filters: aFilters,
          and: false
        });
      },

      /**
       *multicombobox selectionChange event handler
       * @param {Object} oEvent selectionChange event object
       */
      handleSelectionChange: function (oEvent) {
        if (oEvent.getSource().getSelectedItems().length > 0) {
          oEvent.getSource().setValueState("None");
        } else {
          oEvent.getSource().setValueState("Error");
          oEvent
            .getSource()
            .setValueStateText(this._getI18NText("errorMsgEmptyFilter"));
          MessageToast.show(this._getI18NText("errorMsgEmptyFilter"));
        }
      },

      /**
       *initial company multiCombobox
       */
      onCompanyReceived: function () {
        this.byId("companyFilter").addSelectedItem(
          this.byId("companyFilter").getItems()[0]
        );
      },

      /**
       * event handler for category filter
       */
      onCategoryChange: function () {
        this.filterVizData();
      },

      /**
       *format float number into percentage
       * @param {float} fValue value to be formatted
       * @returns {String} percentage value
       */
      formatPercentage: function (fValue) {
        var percentage = sap.ui.core.format.NumberFormat.getPercentInstance({
          style: "precent",
          maxFractionDigits: 2
        });
        return percentage.format(fValue);
      },

      /**
       *get i18N text
       * @param {String} sKey i18N key
       * @return {String} i18n text
       */
      _getI18NText: function (sKey) {
        return this._oResourceBundle.getText(sKey);
      },

      /**
       *event handler for icon press
       *@param{object}oEvent icon press event object
       */
      onSalesVizIconPress: function (oEvent) {
        var oIcon = oEvent.getSource();
        this.switchVizContent("salesVizFrameContainer", oIcon);
      },
      /**
       *event handler for icon press
       *@param{object} oEvent  icon press event object
       */
      onYoYVizIconPress: function (oEvent) {
        var oIcon = oEvent.getSource();
        this.switchVizContent("yoyVizFrameContainer", oIcon);
      },
      /**
       *event handler for icon press
       *@param{object} oEvent icon press event object
       */
      onRatioCurrentVizIconPress: function (oEvent) {
        var oIcon = oEvent.getSource();
        this.switchVizContent("ratioCurrentVizFrameContainer", oIcon);
      },
      /**
       *event handler for icon press
       *@param{object}oEvent icon press event object
       */
      onRatioPreviousVizIconPress: function (oEvent) {
        var oIcon = oEvent.getSource();
        this.switchVizContent("ratioPreviousVizFrameContainer", oIcon);
      },
      /**
       *choose viz content object and switch content;
       * @param {string} sKey key of this._aVizContainers;
       * @param {object} oIcon icon object;
       */
      switchVizContent: function (sKey, oIcon) {
        if (
          this._aVizContainers[sKey].oVizFrameContainer.getSelectedContent() ===
          this._aVizContainers[sKey].oVizChartContent
        ) {
          oIcon.setSrc("sap-icon://bar-chart");
          this._aVizContainers[sKey].oVizFrameContainer.switchChart(
            this._aVizContainers[sKey].oVizTableContent
          );
        } else {
          oIcon.setSrc("sap-icon://table-view");
          this._aVizContainers[sKey].oVizFrameContainer.switchChart(
            this._aVizContainers[sKey].oVizChartContent
          );
        }
      },

      /**
       * Controller exit lifecycle
       *
       */
      onExit: function () {
        this.byId("idPopOverColumn").destroy();
        this.byId("idPopOverYoY").destroy();
        this.byId("idPopOverPie").destroy();
        this.byId("idPopOverPieYoY").destroy();
      },

      /**
       *Pop up error message when OData fails
       *
       * @param {Object} error OData error
       */
      _onODataError: function (error) {
        var aMessage = JSON.parse(error.responseText).error.innererror
          .errordetails;
        MessageToast.show(aMessage ? aMessage[0].message : error.message);
      },
      /**
       * Collapse Filter Panel
       *
       */
      _collapsePanel: function () {
        if (sap.ui.Device.system.phone) {
          var oSettingsPanel = this.byId("settingsPanel");
          if (oSettingsPanel) {
            oSettingsPanel.setExpanded(false);
          }
        }
      }
    });
  }
);
