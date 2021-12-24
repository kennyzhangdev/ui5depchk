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
        var oTestTable = new Table();
        this.testTable2 = new Table();
        this.aLastYearMonth = [];
        this.aCurrentYearMonth = [];

        var oModel = new ODataModel();
        this._oModel2 = new ODataModel();
        var oModel3 = new sap.ui.model.odata.ODataModel();
        var sNavMode = oTestTable.getNavigationMode();
        var iSelectedIndex = oTestTable.getSelectedIndex();
        var oTest2Table = oTestTable;
        var iTest2 = oTest2Table.getSelectedIndex();
        this.aFullYearMonth = [];
        this.getView().setModel(new JSONModel(), "salesModel");
        this._oResourceBundle = this.getOwnerComponent()
          .getModel("i18n")
          .getResourceBundle();
        var oMonthPicker = this.byId("oMonthPicker");
        oMonthPicker.setMaxDate(new Date());
        oMonthPicker.setDateValue(oMonthPicker.getMaxDate());

        this.initialYoYVizFrame();
        this.initialSalesVizFrame();
        this.initialRatioVizFrame();
        this._aVizContainers = {
          salesVizFrameContainer: {
            oVizTableContent: this.generateVizContent("SalesVizTable"),
            oVizChartContent: this.byId("salesContainer").getContent()[0],
            oVizFrameContainer: this.byId("salesContainer"),
            oIcon: this.byId("salesVizFrameBtn")
          },
          yoyVizFrameContainer: {
            oVizTableContent: this.generateVizContent("YoYVizTable"),
            oVizChartContent: this.byId("yoyContainer").getContent()[0],
            oVizFrameContainer: this.byId("yoyContainer"),
            oIcon: this.byId("yoyVizFrameBtn")
          },
          ratioCurrentVizFrameContainer: {
            oVizTableContent: this.generateVizContent("RatioCurrentVizTable"),
            oVizChartContent: this.byId(
              "ratioCurrentContainer"
            ).getContent()[0],
            oVizFrameContainer: this.byId("ratioCurrentContainer"),
            oIcon: this.byId("ratioCurrentVizFrameBtn")
          },
          ratioPreviousVizFrameContainer: {
            oVizTableContent: this.generateVizContent("RatioPreviousVizTable"),
            oVizChartContent: this.byId(
              "ratioPreviousContainer"
            ).getContent()[0],
            oVizFrameContainer: this.byId("ratioPreviousContainer"),
            oIcon: this.byId("ratioPreviousVizFrameBtn")
          }
        };
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

      onAfterRendering: function () {},

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
          .read("/ZSDCR_C001_Q008Results", {
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
          .read("/ZSDCR_C001_Q009Results", {
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
          .read("/ZSDCR_C001_Q010Results", {
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
       * initial viz frame
       *
       */
      initialYoYVizFrame: function () {
        var that = this;
        Format.numericFormatter(ChartFormatter.getInstance());
        var formatPattern = ChartFormatter.DefaultPattern;
        var oVizFrameColumn = this.getView().byId("idVizFrameYear");

        oVizFrameColumn.setVizProperties({
          plotArea: {
            window: {
              start: "firstDataPoint",
              end: "lastDataPoint"
            },
            dataLabel: {
              visible: true,
              style: {
                fontSize: "14px"
              },
              hideWhenOverlap: false,
              renderer: function (oEvent) {
                var aYoYSalesData = that
                  .getView()
                  .getModel("salesModel")
                  .getData().yoyVizData;
                aYoYSalesData.forEach(function (yearData) {
                  if (yearData.fieldText === oEvent.ctx.Category) {
                    if (
                      yearData.fieldName === "currentYearActual" ||
                      yearData.fieldName === "lastYearActual"
                    ) {
                      oEvent.text = that.formatPercentage(yearData.ratio);
                    }
                  }
                });
              }
            },
            dataShape: {
              primaryAxis: ["column"]
            },
            dataPointStyle: {
              rules: [
                {
                  callback: function (oData) {
                    var aYoYSalesData = that
                      .getView()
                      .getModel("salesModel")
                      .getData().yoyVizData;
                    var bRule = false;
                    aYoYSalesData.forEach(function (yearData) {
                      if (yearData.fieldText === oData.Category) {
                        if (
                          (yearData.fieldName === "currentYearActual" ||
                            yearData.fieldName === "lastYearActual") &&
                          yearData.ratio >= 1
                        ) {
                          bRule = true;
                        }
                      }
                    });
                    return bRule;
                  },
                  properties: {
                    color: "sapUiChartPaletteSemanticGood",
                    dataLabel: true
                  },
                  displayName: this._getI18NText("goodField")
                },
                {
                  callback: function (oData) {
                    var aYoYSalesData = that
                      .getView()
                      .getModel("salesModel")
                      .getData().yoyVizData;
                    var bRule = false;
                    aYoYSalesData.forEach(function (yearData) {
                      if (yearData.fieldText === oData.Category) {
                        if (
                          (yearData.fieldName === "currentYearActual" ||
                            yearData.fieldName === "lastYearActual") &&
                          yearData.ratio < 1
                        ) {
                          bRule = true;
                        }
                      }
                    });
                    return bRule;
                  },
                  properties: {
                    color: "sapUiChartPaletteSemanticBad",
                    dataLabel: "true"
                  },
                  displayName: this._getI18NText("badField")
                }
              ],
              others: {
                properties: {
                  color: "sapUiChartPaletteSequentialHue1",
                  dataLabel: true
                },
                displayName: this._getI18NText("normalField")
              }
            }
          },
          valueAxis: {
            label: {
              formatString: formatPattern.SHORTFLOAT
            },
            title: {
              visible: false
            }
          },
          categoryAxis: {
            title: {
              visible: false
            }
          },
          title: {
            visible: true
          },
          interaction: {
            selectability: {
              //plotStdSelection:false,
              axisLabelSelection: false,
              legendSelection: false,
              mode: "EXCLUSIVE"
            }
          }
        });

        var oPopOver = this.getView().byId("idPopOverYoY");
        oPopOver.connect(oVizFrameColumn.getVizUid());
      },

      /**
       * initial viz frame
       *
       */
      initialSalesVizFrame: function () {
        var that = this;
        Format.numericFormatter(ChartFormatter.getInstance());
        var formatPattern = ChartFormatter.DefaultPattern;
        var oVizFrameColumn = this.getView().byId("idVizFrameSales");

        oVizFrameColumn.setVizProperties({
          plotArea: {
            window: {
              start: "firstDataPoint",
              end: "lastDataPoint"
            },
            dataLabel: {
              visible: true,
              style: {
                fontSize: "10px"
              },
              hideWhenOverlap: false,
              renderer: function (oEvent) {
                var aYearSalesData = that
                  .getView()
                  .getModel("salesModel")
                  .getData().salesVizData;
                if (oEvent.ctx.measureNames === "Actual") {
                  aYearSalesData.forEach(function (oDate) {
                    if (oDate.fieldText === oEvent.ctx.Category) {
                      var sText = that._getI18NText(oDate.ratioName);
                      oEvent.text = sText + that.formatPercentage(oDate.ratio);
                    }
                  });
                }
              }
            },
            dataShape: {
              primaryAxis: ["column"]
            },
            dataPointStyle: {
              rules: [
                {
                  callback: function (oData) {
                    var aYearSalesData = that
                      .getView()
                      .getModel("salesModel")
                      .getData().salesVizData;
                    var bRule = false;
                    if (oData.measureNames === "Actual") {
                      aYearSalesData.forEach(function (yearData) {
                        if (yearData.fieldText === oData.Category) {
                          if (
                            (yearData.fieldName === "completeOrder" ||
                              yearData.fieldName === "deliveryOrder") &&
                            yearData.ratio >= 1
                          ) {
                            bRule = true;
                          } else if (
                            yearData.fieldName === "salesOrder" &&
                            yearData.ratio === 1
                          ) {
                            bRule = true;
                          }
                        }
                      });
                    }
                    return bRule;
                  },
                  properties: {
                    color: "sapUiChartPaletteSemanticGood",
                    dataLabel: true
                  },
                  displayName: this._getI18NText("goodField")
                },
                {
                  callback: function (oData) {
                    var aYearSalesData = that
                      .getView()
                      .getModel("salesModel")
                      .getData().salesVizData;
                    var bRule = false;
                    if (oData.measureNames === "Actual") {
                      aYearSalesData.forEach(function (yearData) {
                        if (yearData.fieldText === oData.Category) {
                          if (
                            (yearData.fieldName === "completeOrder" ||
                              yearData.fieldName === "deliveryOrder") &&
                            yearData.ratio < 1
                          ) {
                            bRule = true;
                          } else if (
                            yearData.fieldName === "salesOrder" &&
                            yearData.ratio !== 1
                          ) {
                            bRule = true;
                          }
                        }
                      });
                    }
                    return bRule;
                  },
                  properties: {
                    color: "sapUiChartPaletteSemanticBad",
                    dataLabel: "true"
                  },
                  displayName: this._getI18NText("badField")
                }
              ],
              others: {
                properties: {
                  color: "sapUiChartPaletteSequentialHue1",
                  dataLabel: true
                },
                displayName: this._getI18NText("normalField")
              }
            }
          },
          valueAxis: {
            label: {
              formatString: formatPattern.SHORTFLOAT
            },
            title: {
              visible: false
            }
          },
          categoryAxis: {
            title: {
              visible: false
            }
          },
          title: {
            visible: true
          },
          interaction: {
            selectability: {
              //plotStdSelection:false,
              axisLabelSelection: false,
              legendSelection: false,
              mode: "EXCLUSIVE"
            }
          }
        });
        var oPopOver = this.getView().byId("idPopOverColumn");
        oPopOver.connect(oVizFrameColumn.getVizUid());
      },

      /**
       * initial viz frame
       */
      initialRatioVizFrame: function () {
        Format.numericFormatter(ChartFormatter.getInstance());
        var formatPattern = ChartFormatter.DefaultPattern;
        var oVizFramePieCurrent = this.getView().byId("idVizFrameCurrentMonth");
        var oVizFramePieYoY = this.getView().byId("idVizFrameYoYPie");
        var oVizProperty = {
          plotArea: {
            window: {
              start: "firstDataPoint",
              end: "lastDataPoint"
            },
            dataLabel: {
              visible: true,
              hideWhenOverlap: true
            }
          },
          valueAxis: {
            label: {
              formatString: formatPattern.SHORTFLOAT
            },
            title: {
              visible: true
            }
          },
          categoryAxis: {
            title: {
              visible: true
            }
          },
          title: {
            visible: true
          },
          interaction: {
            selectability: {
              //plotStdSelection:false,
              axisLabelSelection: false,
              legendSelection: false,
              mode: "EXCLUSIVE"
            }
          }
        };
        oVizFramePieYoY.setVizProperties(oVizProperty);
        oVizFramePieCurrent.setVizProperties(oVizProperty);

        this.getView()
          .byId("idPopOverPieYoY")
          .connect(oVizFramePieYoY.getVizUid());
        this.getView()
          .byId("idPopOverPie")
          .connect(oVizFramePieCurrent.getVizUid());
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
       * filter viz data according to category filter
       */
      filterVizData: function () {
        var aVizData = this.getView()
          .getModel("salesModel")
          .getProperty("/originVizData");
        var aSelectedKey = this.byId("category").getSelectedKeys();
        var aFilteredData = [];
        if (aVizData) {
          aFilteredData = aVizData.filter(function (vizDate) {
            if (aSelectedKey.indexOf(vizDate.fieldName) > -1) {
              return true;
            } else {
              return false;
            }
          });
        }
        this.getView()
          .getModel("salesModel")
          .setProperty("/salesVizData", aFilteredData);
      },

      /**
       * generate previous months viz data
       * @param {Array} aResponse response from backend
       * @returns {Array} viz frame data array
       */
      _generateYearVizData: function (aResponse) {
        var aVizArray = [];
        if (aResponse.length > 0) {
          var oCompleteOrder = {
            //bw field name rkf03
            fieldName: "completeOrder",
            ratioName: "completeOrderRatio",
            fieldText: this._getI18NText("completeOrder"),
            year: aResponse[0].A0CALYEAR,
            actual: 0,
            target: 0,
            ratio: 0
          };

          var oDeliveryOrder = {
            //bw field name rkf02
            fieldName: "deliveryOrder",
            ratioName: "deliveryOrderRatio",
            fieldText: this._getI18NText("deliveryOrder"),
            year: aResponse[0].A0CALYEAR,
            actual: 0,
            target: 0,
            ratio: 0
          };

          var oSalesOrder = {
            //bw field name rkf01
            fieldName: "salesOrder",
            ratioName: "salesOrderRatio",
            fieldText: this._getI18NText("salesOrder"),
            year: aResponse[0].A0CALYEAR,
            actual: 0,
            target: 0,
            ratio: 0
          };

          for (var i = 0; i < aResponse.length; i++) {
            oSalesOrder.actual =
              oSalesOrder.actual + parseFloat(aResponse[i].ZSDCR_C001_RKF001);
            oSalesOrder.target =
              oSalesOrder.target + parseFloat(aResponse[i].ZSDCR_C001_RKF004);

            oDeliveryOrder.actual =
              oDeliveryOrder.actual +
              parseFloat(aResponse[i].ZSDCR_C001_RKF002);
            oDeliveryOrder.target =
              oDeliveryOrder.target +
              parseFloat(aResponse[i].ZSDCR_C001_RKF004);

            oCompleteOrder.actual =
              oCompleteOrder.actual +
              parseFloat(aResponse[i].ZSDCR_C001_RKF003);
            oCompleteOrder.target =
              oCompleteOrder.target +
              parseFloat(aResponse[i].ZSDCR_C001_RKF004);
          }
          oCompleteOrder.ratio =
            oCompleteOrder.target === 0
              ? 0
              : oCompleteOrder.actual / oCompleteOrder.target;
          oDeliveryOrder.ratio =
            oDeliveryOrder.target === 0
              ? 0
              : oDeliveryOrder.actual / oDeliveryOrder.target;
          if (
            oSalesOrder.actual >= oSalesOrder.target * 2 ||
            oSalesOrder.target === 0
          ) {
            oSalesOrder.ratio = 0;
          } else if (oSalesOrder.actual < oSalesOrder.target) {
            oSalesOrder.ratio = oSalesOrder.actual / oSalesOrder.target;
          } else if (oSalesOrder.actual > oSalesOrder.target) {
            oSalesOrder.ratio =
              1 -
              (oSalesOrder.actual - oSalesOrder.target) / oSalesOrder.target;
          }
          aVizArray = [oCompleteOrder, oDeliveryOrder, oSalesOrder];
        } else {
          MessageToast.show(this._oResourceBundle.getText("noDataReturned"));
        }
        return aVizArray;
      },

      /**
       * generate current period viz data
       * @param {Array} aResponse response from backend
       * @returns {Array} viz frame data array
       */
      _generateSalesVizData: function (aResponse) {
        var sCurrentYear, sCurrentMonth, sMonth;
        sCurrentYear = this.byId("oMonthPicker").getDateValue().getFullYear();
        sCurrentMonth = this.byId("oMonthPicker").getDateValue().getMonth();
        var aVizData = [];
        var oFullYearTarget = {
          fieldName: "fullYear",
          fieldText: sCurrentYear + this._getI18NText("fullYearTargetLabel"),
          quantity: 0,
          ratio: 0
        };
        var oCurrentYearTarget = {
          fieldName: "currentYearTarget",
          fieldText: "",
          quantity: 0,
          ratio: 0
        };
        var oCurrentYearActual = {
          fieldName: "currentYearActual",
          fieldText: "",
          quantity: 0,
          ratio: 0
        };
        var oLastYearActual = {
          fieldName: "lastYearActual",
          fieldText: "",
          quantity: 0,
          ratio: 0
        };
        if (aResponse.length > 0) {
          if (this.byId("oMonthPicker").getDateValue().getMonth() === 0) {
            oCurrentYearTarget.fieldText =
              (sCurrentYear - 1).toString() +
              this._getI18NText("fullYearTargetLabel");
            oCurrentYearActual.fieldText =
              (sCurrentYear - 1).toString() +
              this._getI18NText("fullYearActualLabel");
            oLastYearActual.fieldText =
              (sCurrentYear - 2).toString() +
              this._getI18NText("fullYearActualLabel");
          } else {
            if (sCurrentMonth === 1) {
              sMonth = sCurrentMonth;
            } else {
              sMonth = "1-" + sCurrentMonth;
            }
            oCurrentYearTarget.fieldText =
              sMonth + this._getI18NText("currentYearLabel");
            oCurrentYearActual.fieldText =
              sMonth + this._getI18NText("currentYearActualLabel");
            oLastYearActual.fieldText =
              this._getI18NText("lastYearLabel") +
              sMonth +
              this._getI18NText("currentYearActualLabel");
          }

          for (var i = 0; i < aResponse.length; i++) {
            if (this.aFullYearMonth.indexOf(aResponse[i].A0CALMONTH) > -1) {
              oFullYearTarget.quantity =
                oFullYearTarget.quantity +
                parseInt(aResponse[i].ZSDCR_C001_RKF004, 10);
            }
            if (this.aCurrentYearMonth.indexOf(aResponse[i].A0CALMONTH) > -1) {
              oCurrentYearTarget.quantity =
                oCurrentYearTarget.quantity +
                parseInt(aResponse[i].ZSDCR_C001_RKF004, 10);
              oCurrentYearActual.quantity =
                oCurrentYearActual.quantity +
                parseInt(aResponse[i].ZSDCR_C001_RKF003, 10);
            }
            if (this.aLastYearMonth.indexOf(aResponse[i].A0CALMONTH) > -1) {
              oLastYearActual.quantity =
                oLastYearActual.quantity +
                parseInt(aResponse[i].ZSDCR_C001_RKF003, 10);
            }
          }
          oCurrentYearActual.ratio =
            oCurrentYearTarget.quantity === 0
              ? 0
              : oCurrentYearActual.quantity / oCurrentYearTarget.quantity;
          oLastYearActual.ratio =
            oLastYearActual.quantity === 0
              ? 0
              : oCurrentYearActual.quantity / oLastYearActual.quantity;
          aVizData = [
            oFullYearTarget,
            oCurrentYearTarget,
            oCurrentYearActual,
            oLastYearActual
          ];
        }
        return aVizData;
      },

      /**
       * generate pie viz data
       * @param {Array} aList response from backend
       * @returns	{Array} data for pie viz frame
       */
      _generatePieVizData: function (aList) {
        var sYearMonth = this.formatDateString(
          this.byId("oMonthPicker").getDateValue(),
          "MM.yyyy"
        );
        var aSelectedMonth = [];
        var aPreviousMonth = [];
        var aPreviousOriginMonth = [];
        var aMap = {};
        for (var i = 0; i < aList.length; i++) {
          if (aList[i].A0CALMONTH === sYearMonth) {
            aSelectedMonth.push(aList[i]);
          } else if (this.aCurrentYearMonth.indexOf(aList[i].A0CALMONTH) > -1) {
            aPreviousOriginMonth.push(aList[i]);
            if (!aMap[aList[i].A0MATERIAL]) {
              aPreviousMonth.push({
                A0MATERIAL_T: aList[i].A0MATERIAL_T,
                A0MATERIAL: aList[i].A0MATERIAL,
                TotalAmount: parseInt(aList[i].A00O2TJRRRH85US7A11XKMDYSQ, 10)
              });
              aMap[aList[i].A0MATERIAL] = aList[i];
            } else {
              for (var j = 0; j < aPreviousMonth.length; j++) {
                if (aPreviousMonth[j].A0MATERIAL === aList[i].A0MATERIAL) {
                  aPreviousMonth[j].TotalAmount =
                    aPreviousMonth[j].TotalAmount +
                    parseInt(aList[i].A00O2TJRRRH85US7A11XKMDYSQ, 10);
                  break;
                }
              }
            }
          }
        }
        return {
          Current: aSelectedMonth,
          Previous: aPreviousMonth,
          PreviousOrigin: aPreviousOriginMonth
        };
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
