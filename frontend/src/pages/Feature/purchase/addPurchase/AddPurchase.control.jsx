/* eslint-disable react/prop-types */
import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useParams, useNavigate } from "react-router-dom";
import { addPurchaseApi, updatePurchaseApi } from "../../../../constans/apiname";
import * as yup from "yup";
import {
  ApiServiceContext,
  customerrorToast,
  dropdown_api,
  successToast,
} from "../../../../core/core-index";
import dayjs from "dayjs";
import {purchaseSchema} from './addPurchaserschema'

const AddpurchaseContext = createContext({
  purchaseSchema: purchaseSchema,
  onSubmit: () => {},
});

const AddpurchaseComponentController = (props) => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [taxList, setTaxList] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { getData, postData, putData } = useContext(ApiServiceContext);
  const [productService, setProductService] = useState([]);
  const [productServiceCopy, setProductServiceCopy] = useState([]);
  const [round, setRound] = useState(false);
  const [roundOffAction, setRoundOffAction] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState(null);
  const [productOption, setProductOption] = useState([]);
  const [productOptionCopy, setProductOptionCopy] = useState([]);
  const [trimmedDataURL, setTrimmedDataURL] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const { id } = useParams();

  // useEffect(() => {
  //   getProductList();
  //   getBankList();
  //   getTaxList();
  // }, []);

  const getTaxList = async () => {
    const tax = await getData(dropdown_api?.tax_api);
    let newTax = tax?.data?.map((item) => {
      return {
        id: item?.id,
        label: item?.name + ` ${item?.taxRate}%`,
        value: parseInt(item?.taxRate),
      };
    });
    setTaxList(newTax);
  };

  const getProductList = async () => {
    const productList = await getData(dropdown_api?.product_api);
    var dataList = productList?.data;
    if (dataList?.length > 0) {
      setProductServiceCopy(dataList);
      let datas = [];
      setProductService(datas);
      getQuantity(dataList);
    }
  };

  const getQuantity = (dataList) => {
    let newProductList = [];
    newProductList = dataList?.map((item) => {
      return {
        id: item?._id,
        text: item?.name,
        quantity: 1,
      };
    });
    setProductOption(newProductList);
    setProductOptionCopy(newProductList);
  };

  const getBankList = async () => {
    const bankList = await getData(dropdown_api?.bank_api);
    const newBankList = bankList?.data?.map((item) => {
      return { id: item.userId, text: item.name };
    });
   
  };

  const calculateRate = (record) => {
    var discountQuantity = productOptionCopy.find(
      (ele) => ele.id == record?._id
    )?.quantity;
    let disQ = discountQuantity ? parseInt(discountQuantity) : 0;
    let selling = record?.purchasePrice;
    return (disQ * selling).toFixed(2);
  };

  const calculateDiscountAmount = (record) => {
    var discountQuantity = productOptionCopy.find(
      (ele) => ele.id == record?._id
    )?.quantity;
    let disQ = discountQuantity ? parseInt(discountQuantity) : 0;
    return record?.discountType == 2
      ? `${(
          (disQ * record?.purchasePrice * record?.discountValue) /
          100
        ).toFixed(2)} `
      : disQ === 0
      ? "0.00"
      : record?.discountValue?.toFixed(2);
  };

  const calculateTaxAmount = (record) => {
    var countQuantity = productOptionCopy.find(
      (ele) => ele.id == record?._id
    )?.quantity;
    var countTax = productServiceCopy.find((ele) => ele._id == record?._id)?.tax
      ?.taxRate;
    let discountTax =
      record?.discountType == 2
        ? `${(
            ((countQuantity ? countQuantity : 0) *
              record?.purchasePrice *
              record?.discountValue) /
            100
          ).toFixed(2)} `
        : countQuantity === 0
        ? "0.00"
        : record?.discountValue?.toFixed(2);

    let SumTax =
      (countQuantity ? countQuantity : 0) * record?.purchasePrice - discountTax;
    let finalTax = (SumTax * Number(countTax)) / 100;
    return (Number(finalTax) ? finalTax : 0).toFixed(2);
  };

  const calculateAmount = (record) => {
    var countFinal = productOptionCopy.find(
      (ele) => ele.id == record?._id
    )?.quantity;

    var countTaxFinal = productServiceCopy.find((ele) => ele._id == record?._id)
      ?.tax?.taxRate;

    let discountFinal =
      record?.discountType == 2
        ? `${(
            ((countFinal ? countFinal : 0) *
              record?.purchasePrice *
              record?.discountValue) /
            100
          ).toFixed(2)} `
        : countFinal === 0
        ? "0.00"
        : record?.discountValue?.toFixed(2);

    let SumFinal =
      (countFinal ? countFinal : 0) * record?.purchasePrice - discountFinal;

    let finalTax = (Number(SumFinal) * Number(countTaxFinal)) / 100;
    return (Number(SumFinal) + Number(finalTax)).toFixed(2);
  };

  const calculateSum = () => {
    let initialValue = 0;
    let sum = productService.reduce(function (accumulator, curValue) {
      return parseFloat(accumulator) + parseFloat(calculateAmount(curValue));
    }, initialValue);
    let fixed = sum.toFixed(2);
    return fixed;
  };

  const calculateDiscount = () => {
    let initialValue = 0;
    let sum = productService.reduce(function (accumulator, curValue) {
      return (
        parseFloat(accumulator) + parseFloat(calculateDiscountAmount(curValue))
      ).toFixed(2);
    }, initialValue);
    return sum;
  };

  const calculateTax = () => {
    let initialValue = 0;
    let sum = productService.reduce(function (accumulator, curValue) {
      return parseFloat(accumulator) + parseFloat(calculateTaxAmount(curValue));
    }, initialValue);
    return sum;
  };

  const fullAmount = () => {
    var fullAmountResult = round ? Math.round(calculateSum()) : calculateSum();
    return fullAmountResult;
  };

  const sentAmount = () => {
    var sentAmountValue = round
      ? parseInt(fullAmount() - advanceAmount)
      : parseInt(fullAmount() - advanceAmount).toFixed(2);
    return sentAmountValue;
  };

  const onSubmit = async (data) => {
    let sending = JSON.parse(JSON.stringify(productService));
    let finalArray = [];
    sending.map((item) => {
      let finished = productOptionCopy.map((ele) => {
        if (item._id === ele.id) {
          const rate = calculateRate(item);
          const discountAmount = calculateDiscountAmount(item); // Calculate the discount amount for each row
          const taxAmount = calculateTaxAmount(item);
          const amount = fullAmount(item); // Calculate the amount for each row
          finalArray.push({
            ...item,
            alertQuantity: ele.quantity,
            rate: rate,
            amount: amount,
            discountAmount: discountAmount,
            taxAmount: taxAmount,
          });
          return {
            ...item,
            alertQuantity: ele.quantity,
            amount: amount,
            discountAmount: discountAmount,
            taxAmount: taxAmount,
          };
        }
      });
    });

    const formData = new FormData();
    for (let i = 0; i < finalArray.length; i++) {
      formData.append(`items[${i}][productId]`, finalArray[i]._id);
      formData.append(`items[${i}][quantity]`, finalArray[i].alertQuantity);
      formData.append(`items[${i}][unit]`, finalArray[i]?.units?._id);
      formData.append(`items[${i}][rate]`, finalArray[i]?.purchasePrice);
      formData.append(`items[${i}][discount]`, finalArray[i]?.discountValue);
      formData.append(`items[${i}][tax]`, finalArray[i]?.tax?.taxRate);
      formData.append(`items[${i}][amount]`, finalArray[i]?.amount);
      formData.append(`items[${i}][productName]`, finalArray[i]?.name);
      formData.append(
        `items[${i}][discountValue]`,
        finalArray[i]?.discountAmount
      );
    }
    formData.append(
      "vendorId",
      data.vendorId?.value ? data.vendorId?.value : data?.vendorId
    );
    location?.state?.rowData && formData.append("_id", id);

    formData.append("purchaseDate", dayjs(data?.purchaseDate).toDate());
    // For antd Datepicker
    formData.append("referenceNo", data.referenceNo);
    formData.append(
      "supplierInvoiceSerialNumber",
      data.supplierInvoiceSerialNumber
    );
    formData.append("taxableAmount", calculateSum());
    formData.append("totalDiscount", calculateDiscount());
    formData.append("roundOff", round);
    formData.append("TotalAmount", sentAmount());
    formData.append("discountType", 143);
    formData.append("discount", 10);
    formData.append("tax", "SGST");
    formData.append("vat", calculateTax().toFixed(2));
    formData.append("notes", data?.notes);
    formData.append("termsAndCondition", data?.termsAndCondition);

    formData.append("bank", data?.bank?.value ? data?.bank?.value : data?.bank);
    formData.append("sign_type", data?.sign_type);
    if (data?.sign_type == "eSignature") {
      formData.append("signatureName", data?.signatureName);
      formData.append("signatureImage", signatureData);
    } else {
      formData.append("signatureId", data?.signatureId?.value);
    }

    if (finalArray?.length > 0) {
      const checkQuantity = finalArray?.some(
        (item) => item?.alertQuantity === 0
      );
      if (checkQuantity) {
        customerrorToast("Product quantity is required");
      } else {
        const url = `${updatePurchaseApi}/${id}`;
        const successResponse = location?.state?.rowData
          ? await putData(url, formData)
          : await postData(addPurchaseApi, formData);
        if (successResponse) {
          successToast(
            location?.state?.rowData
              ? "Purchase Updated  Successfully"
              : "Purchase Added  Successfully"
          );
          navigate("/purchases");
        }
      }
    } else {
      customerrorToast(`Products  is required`);
    }
  };

  useEffect(() => {
    getProductList();
    getBankList();
    getTaxList();
    let elements = Array.from(
      document.getElementsByClassName("react-datepicker-wrapper")
    );
    elements.map((element) => element.classList.add("w-100"));
  }, []);

  return (
    <AddpurchaseContext.Provider
      value={{
        purchaseSchema,
        productServiceCopy,
        productService,
        setProductService,
        taxList,
        productOption,
        setProductOption,
        productOptionCopy,
        setProductOptionCopy,
        onSubmit,
        calculateRate,
        calculateDiscountAmount,
        calculateTaxAmount,
        calculateAmount,
        calculateSum,
        calculateDiscount,
        calculateTax,
        fullAmount,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        round,
        setRound,
        roundOffAction,
        setRoundOffAction,
        getBankList,
        trimmedDataURL,
        setTrimmedDataURL,
        setSignatureData,
      }}
    >
      {props.children}
    </AddpurchaseContext.Provider>
  );
};
export { AddpurchaseContext, AddpurchaseComponentController };