const Razorpay = require("razorpay");

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { orderVailidationSchema } = require("./joiValidator/orderJoiSchema");
const { handleError, handleResponse, generateInvoice, sendMailer, orderConfirmationMail, orderNotifiationEmail, newGenerateInvoice } = require("../utils/helper");
const { Order, Product, ProductVariant, User, AddressBook, Inventory, Transaction, Offer, Discount, UserWallet, Coin } = require("../modals");

const { isValidObjectId, default: mongoose } = require("mongoose");

// Place order
exports.create = async (req, res) => {
  try {
    const { products, address_id, shipping_charge, order_type, user_wallet_id, } = req.body;

    const { error } = orderVailidationSchema.validate(req.body, { abortEarly: false, });
    if (error) {
      handleError(error, 400, res);
      return;
    }

    let prescription_url = req.file ? `${process.env.BASE_URL}/media/${req?.file?.filename}` : "";
    const requirePrescription = [];

    // const comboDiscountProducts = []
    //-------------------------------- Check prescription require products --------------------------------

    await Promise.all(products.map(async (item) => {
      if (!req.file) {
        const getNeededPrescriptions = await Product.findOne({ _id: item.product_id, isRequirePrescription: true, });

        if (getNeededPrescriptions) {
          requirePrescription.push(getNeededPrescriptions.title);
        }
      }
    })
    );

    if (requirePrescription.length > 0) {
      res.status(400).send({
        message: `Prescription upload is required for the following items: ${requirePrescription}. Please upload your prescription to proceed.`,
        error: true,
      });
      return;
    }

    //-------------------------------- Check address is exist or not --------------------------------
    const address = await AddressBook.findOne({ _id: address_id });
    if (!address) {
      handleError("Invalid address ID", 400, res);
      return;
    }

    //-------------------------------- Check is user loggedIn or not --------------------------------
    const user = await User.findOne({ _id: req?.user?._id });

    if (!user) {
      handleError("You need to login", 400, res);
      return;
    }

    // //-------------------------------- Handle user wallet coins and apply or not --------------------------------
    // let getCoinAmountValue = 0;
    // let loyalityCoins = 0;

    // if (user_wallet_id && user_wallet_id !== "null") {
    //   // Check for null and string "null"
    //   const userWallet = await UserWallet.findOne({ _id: user_wallet_id });

    //   if (!userWallet) {
    //     handleError("Invalid user_wallet  ID", 400, res);
    //     return;
    //   }

    //   const getCoin = await Coin.findOne({});

    //   loyalityCoins = userWallet.coins;

    //   // const getOneCoinValue = getCoin?.coins / getCoin?.coins_amount;
    //   // getCoinAmountValue = userWallet?.coins / getOneCoinValue;

    //   // Extract the coin values
    //   const pointsPerCoin = getCoin.coins; // Points per coin
    //   const rupeesPerCoin = getCoin.coins_amount; // Rupees per coin

    //   // Calculate the value of 1 point (1 point = rupeesPerCoin / pointsPerCoin)
    //   const valuePerPoint = rupeesPerCoin / pointsPerCoin;

    //   // Total points in the user's wallet
    //   const totalPoints = userWallet.coins;

    //   // Calculate the total rupees
    //   getCoinAmountValue = totalPoints * valuePerPoint;
    //   console.log(`Total rupees: ${getCoinAmountValue}`);

    //   await UserWallet.updateOne({ _id: user_wallet_id }, { coins: 0 }, { new: true });
    // }

    // // const couponDiscount = await Offer.findOne({ coupon_code: req.body.coupon_code })
    // // Check inventory availability
    // const outOfStockVariants = [];
    // let dueQuantity;

    // await Promise.all(
    //   products.map(async (item) => {
    //     const inventory = await Inventory.findOne({ product_id: item.product_id, product_variant_id: item.product_variant_id, });

    //     dueQuantity = inventory?.total_variant_quantity - inventory?.sale_variant_quantity;

    //     if (dueQuantity < item.quantity) {
    //       outOfStockVariants.push({
    //         product_id: item.product_id,
    //         product_variant_id: item.product_variant_id,
    //         quantity: item.quantity,
    //       });
    //     }
    //   })
    // );

    // if (outOfStockVariants.length > 0) {
    //   return res.status(400).send({
    //     message: "Out of stock some product varients.",
    //     error: true,
    //     dueQuantity,
    //     outOfStockVariants,
    //   });
    // }

    // // Order
    // // const newData = await Promise.all(products.map(async (item, i) => {
    // //   console.log('item<<<<<<<<', item);
    // //   const price = parseFloat(item.price); // Convert price to number
    // //   const quantity = parseInt(item.quantity, 10); // Convert quantity to integer

    // //   // Validate price and quantity
    // //   if (isNaN(price) || isNaN(quantity)) {
    // //     console.error('Invalid price or quantity:', item); // Log invalid data
    // //     item.total = 0; // Set total to 0 if data is invalid
    // //   } else {
    // //     if (item?.discount_id !== null && item.discount_id === undefined) {
    // //       const discount = await Discount.findOne({ _id: item?.discount_id });
    // //       item.total = discount?.discount_type === "perc" ? quantity * price * (1 - discount?.discount / 100) : quantity * price - discount?.discount;
    // //     } else {
    // //       item.total = quantity * price;
    // //     }
    // //   }

    // //   console.log('item.total>>>>>>>>>', item.total);

    // //   return item;
    // // }));

    // // let subTotal = 0;

    // // newData.forEach((item) => {
    // //   // Only add to subtotal if item.total is a valid number
    // //   if (!isNaN(item.total)) {
    // //     subTotal += item.total;
    // //   } else {
    // //     console.error('Invalid total for item:', item); // Log items with invalid total
    // //   }
    // // });

    // // Order processing with asynchronous calculation for each product


    // const newData = await Promise.all(products.map(async (item, i) => {
    //   // Convert price and quantity to numbers

    //   const productVarientPrice = await ProductVariant.findOne({ _id: item.product_variant_id, productId: item.product_id, })

    //   const price = parseFloat(productVarientPrice?.price); // Convert price to a float
    //   const quantity = parseInt(item.quantity, 10); // Convert quantity to an integer

    //   // Validate price and quantity
    //   if (isNaN(price) || isNaN(quantity)) {
    //     item.total = 0; // Set total to 0 if data is invalid
    //   }
    //   else {
    //     // If discount_id is present
    //     if (item?.discount_id && item?.discount_id !== 'null' && item?.discount_id !== undefined) {
    //       // Fetch the discount from the database
    //       const discount = await Discount.findOne({ _id: item.discount_id });

    //       // Apply discount logic
    //       if (discount) {
    //         // If discount type is percentage
    //         if (discount?.discount_type === "perc") {
    //           item.total = quantity * price * (1 - discount?.discount / 100);
    //           item.price = price

    //         } else {
    //           // Apply fixed discount
    //           item.total = quantity * price - discount?.discount;
    //           item.price = price

    //         }
    //       } else {
    //         // If no discount is found, calculate total without discount
    //         item.total = quantity * price;
    //         item.price = price

    //       }
    //     } else {
    //       // No discount case, calculate total normally
    //       item.total = quantity * price;
    //       item.price = price
    //     }
    //   }

    //   return item; // Return the updated item with total
    // }));

    // // After processing all products, calculate subTotal
    // let subTotal = 0;
    // let grandTotal = 0;

    // // Sum up the totals for all valid products
    // newData.forEach((item) => {
    //   if (!isNaN(item.total)) {
    //     subTotal += item.total; // Add the total if it's a valid number
    //   } else {
    //     console.error('Invalid total for item:', item); // Log invalid total
    //   }
    // });

    // // Calculate initial total including subtotal and shipping charge
    // const totalBeforeDiscount = Number(subTotal) + Number(shipping_charge);
    // grandTotal = totalBeforeDiscount;
    // // Subtract coin amount value
    // if (user_wallet_id) {
    //   grandTotal -= getCoinAmountValue;
    // }






    //-------------------------------- Handle user wallet coins and apply or not --------------------------------
    let getCoinAmountValue = 0;
    let loyalityCoins = 0;

    // Check for valid user_wallet_id
    console.log('user_wallet_id>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', user_wallet_id);

    const userWallet = await UserWallet.findOne({ _id: user_wallet_id });

    const getCoin = await Coin.findOne({});

    if (!getCoin) {
      handleError("Invalid coin data", 400, res);
      return;
    }

    // Extract the coin values
    const pointsPerCoin = getCoin?.coins || 0;  // Default to 0 if invalid
    const rupeesPerCoin = getCoin?.coins_amount || 0;  // Default to 0 if invalid

    // Ensure pointsPerCoin is not 0 to avoid division by zero
    if (pointsPerCoin === 0) {
      console.error('Invalid points per coin');
      return;
    }

    // Calculate the value of 1 point (1 point = rupeesPerCoin / pointsPerCoin)
    const valuePerPoint = rupeesPerCoin / pointsPerCoin;

    // Total points in the user's wallet
    const totalPoints = userWallet?.coins || 0;  // Default to 0 if no points

    console.log(`userWallet coins: ${userWallet?.coins}, valuePerPoint: ${valuePerPoint}`);

    // Calculate the total rupees
    getCoinAmountValue = totalPoints * valuePerPoint;


    // Reset user wallet coins after using them
    await UserWallet.updateOne({ _id: user_wallet_id }, { coins: 0 }, { new: true });

    // Inventory check for out-of-stock variants
    const outOfStockVariants = [];
    let dueQuantity;

    await Promise.all(
      products.map(async (item) => {
        const inventory = await Inventory.findOne({
          product_id: item.product_id,
          product_variant_id: item.product_variant_id,
        });

        dueQuantity = inventory?.total_variant_quantity - inventory?.sale_variant_quantity;

        // If the dueQuantity is less than the requested quantity, mark it as out of stock
        if (dueQuantity < item.quantity) {
          outOfStockVariants.push({
            product_id: item.product_id,
            product_variant_id: item.product_variant_id,
            quantity: item.quantity,
            dueQuantity,  // Store dueQuantity in each item for better tracking
          });
        }
      })
    );

    // If out-of-stock variants are found, return an error response
    if (outOfStockVariants.length > 0) {
      return res.status(400).send({
        message: "Out of stock for some product variants.",
        error: true,
        dueQuantity,
        outOfStockVariants,
      });
    }

    // Order processing for products, including discounts
    const newData = await Promise.all(products.map(async (item) => {
      const productVariant = await ProductVariant.findOne({
        _id: item.product_variant_id,
        productId: item.product_id
      });

      const price = parseFloat(productVariant?.price);  // Convert price to a float
      const quantity = parseInt(item.quantity, 10);     // Convert quantity to an integer

      if (isNaN(price) || isNaN(quantity)) {
        item.total = 0;  // Set total to 0 if data is invalid
      } else {
        // If a discount is present
        if (item?.discount_id && item?.discount_id !== 'null' && item?.discount_id !== undefined) {
          const discount = await Discount.findOne({ _id: item.discount_id });

          if (discount) {
            if (discount.discount_type === "perc") {
              item.total = quantity * price * (1 - discount.discount / 100);  // Apply percentage discount
            } else {
              item.total = quantity * price - discount.discount;  // Apply fixed discount
            }
            item.price = price;
          } else {
            item.total = quantity * price;  // No discount found, calculate normally
            item.price = price;
          }
        } else {
          item.total = quantity * price;  // No discount, normal price calculation
          item.price = price;
        }
      }

      return item;  // Return the updated item with total
    }));

    // After processing all products, calculate subTotal
    let subTotal = 0;
    let grandTotal = 0;

    // Sum up the totals for all valid products
    newData.forEach((item) => {
      if (!isNaN(item.total)) {
        subTotal += item.total;  // Add valid totals to subTotal
      } else {
        console.error('Invalid total for item:', item);  // Log invalid total
      }
    });

    // Calculate total before discount, including shipping charge
    const totalBeforeDiscount = Number(subTotal) + Number(shipping_charge);

    grandTotal = totalBeforeDiscount;

    // Subtract the loyalty coin amount from the grand total if valid

    console.log(`getCoinAmountValue: ${getCoinAmountValue}, grandTotal: ${grandTotal}`);

    grandTotal = grandTotal - getCoinAmountValue;
    console.log('grandTotal>>>>', grandTotal);

    const data = { products: newData, subTotal, user_id: user._id, address_id, shippingCost: shipping_charge, total: grandTotal, order_type, prescription_url: prescription_url, loyality_coins: getCoinAmountValue, };
    // Add user_wallet_id only if it is valid and not a string "null"
    if (user_wallet_id && user_wallet_id !== "null" && user_wallet_id !== "") {
      data.user_wallet_id = user_wallet_id;
    }


    const newOrder = new Order(data);

    let assignedCoins = 0;

    if (newOrder.total >= 500 && newOrder.total < 700) {
      assignedCoins = 15;
    } else if (newOrder.total >= 700 && newOrder.total < 1500) {
      assignedCoins = 25;
    } else if (newOrder.total >= 1501) {
      assignedCoins = 25;
    } else {
      assignedCoins = 5;
    }

    const getCoins = await UserWallet.findOne({ user_id: req.user._id });

    await UserWallet.updateOne({ user_id: req.user._id }, { coins: getCoins.coins + assignedCoins }, { new: true });

    await newOrder.save();

    const orderItems = await Promise.all(products.map(async (item) => {
      const product = await Product.findOne({ _id: item.product_id });
      const variant = await ProductVariant.findOne({ _id: item.product_variant_id, productId: item.product_id, });

      product._doc.variant = variant;

      const getInventory = await Inventory.findOne({ product_id: item.product_id, product_variant_id: item.product_variant_id, });

      // Initialize saleQty with a default value of 0 if getInventory or sale_variant_quantity is undefined
      const currentSaleQty = getInventory?.sale_variant_quantity || 0;
      const saleQty = Number(currentSaleQty) + Number(item.quantity);

      // Ensure saleQty is a valid number
      if (isNaN(saleQty)) {
        throw new Error("Invalid quantity value");
      }

      await Inventory.updateOne({ product_id: item.product_id, product_variant_id: item.product_variant_id, }, { sale_variant_quantity: saleQty }, { new: true });

      const getUpdateInventorydata = await Inventory.findOne({ product_id: item.product_id, product_variant_id: item.product_variant_id });

      // Check product variant availability in inventory and product list
      if (variant?.quantity === getUpdateInventorydata?.sale_variant_quantity) {
        await ProductVariant.updateOne({ productId: item.product_id, _id: item.product_variant_id }, { inStock: false }, { new: true });
      }

      return {
        itemName: product.title,
        quantity: item.quantity,
        price: variant.price,
      };
    })
    );

    const subject = "Thank You for Your Purchase!";

    const message = orderConfirmationMail(req.user.name, newOrder._id, orderItems, subTotal, shipping_charge, grandTotal, order_type);

    sendMailer(req.user.email, subject, message, res);

    if (order_type === "PREPAID") {
      var razorPayIinstance = new Razorpay({
        key_id: "rzp_test_GcZZFDPP0jHtC4",
        key_secret: "6JdtQv2u7oUw7EWziYeyoewJ",
      });

      const amount = Math.round(grandTotal * 100);

      const options = {
        amount: amount,
        currency: "INR",
        receipt: `${req.user.name}`,
        payment_capture: 1,
      };

      const response = await razorPayIinstance.orders.create(options);

      const transactionData = {
        transaction_id: response.id,
        receipt: response.receipt,
        paid_amount: response.amount,
        currency: response.currency,
        status: response.status,
        order_id: newOrder._id,
      };

      const transaction = new Transaction(transactionData);
      await transaction.save();
    }

    handleResponse(res, newOrder._doc, "Order has been successfully placed.", 201);
  } catch (error) {
    console.log("error>>>>>>>", error);
    handleError(error.message, 400, res);
  }
};

// Get admin all orders list
exports.findAllOrders = async (req, res) => {
  try {
    const {
      q,
      page = 1,
      limit = 10,
      sort = 1,
      startDate,
      endDate,
      status,
    } = req.query;

    // Parse page and limit to integers
    const currentPage = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    // Calculate skip for pagination
    const skip = (currentPage - 1) * pageSize;
    const sortOrder = sort === "1" ? 1 : -1;

    // Initialize match condition for date range
    const matchConditions = {};
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        matchConditions.createdAt.$gte = new Date(startDate); // Start date (inclusive)
      }
      if (endDate) {
        matchConditions.createdAt.$lte = new Date(endDate); // End date (inclusive)
      }
    }
    if (status) {
      matchConditions.status = status; // Add status to match conditions
    }

    // Pipeline for the aggregation
    const pipeline = [
      // Match orders within the specified date range
      {
        $match: {
          ...matchConditions,
        },
      },
      {
        $lookup: {
          from: "users", // Lookup user details
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "addressbooks", // Lookup address details
          localField: "address_id",
          foreignField: "_id",
          as: "address",
        },
      },
      {
        $unwind: { path: "$address", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$products" }, // Unwind products to handle each product separately
      },
      {
        $lookup: {
          from: "products", // Lookup product details
          localField: "products.product_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true },
      },
      {
        // Lookup to get brand details
        $lookup: {
          from: "brands", // Assuming your brand collection is called 'brands'
          localField: "productDetails.brand_id",
          foreignField: "_id",
          as: "brandDetails",
        },
      },
      {
        $unwind: { path: "$brandDetails", preserveNullAndEmptyArrays: true },
      },
      {
        // Lookup to get product category details
        $lookup: {
          from: "productcategories", // Assuming your product category collection is called 'productcategories'
          localField: "productDetails.product_category_id",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "variants", // Lookup variant details
          localField: "products.product_variant_id",
          foreignField: "_id",
          as: "variantDetails",
        },
      },
      {
        $unwind: { path: "$variantDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: "$_id", // Group by order id
          productDetails: {
            $push: {
              _id: "$productDetails._id",
              title: "$productDetails.title",
              sku: "$productDetails.sku",
              brand_name: "$brandDetails.name", // Brand name
              category_name: "$categoryDetails.name", // Category name
              variantDetails: {
                _id: "$variantDetails._id",
                size: "$variantDetails.size",
                color: "$variantDetails.color",
                discount: "$variantDetails.discounted_id",
                price: "$products.price", // Use products.price for bought price
                quantity: "$products.quantity", // Use products.quantity for bought quantity
              },
            },
          },
          user: {
            $first: {
              name: "$user.name",
              email: "$user.email",
            },
          },
          address: {
            $first: {
              bill_to: "$address.bill_to",
              address: "$address.address",
              land_mark: "$address.land_mark",
              state: "$address.state",
              city: "$address.city",
              pincode: "$address.pincode",
              address_type: "$address.address_type",
            },
          },
          subTotal: { $first: "$total" }, // Include total if needed
          shippingCost: { $first: "$shippingCost" }, // Include total if needed
          total: { $first: "$total" }, // Include total if needed
          status: { $first: "$status" }, // Include status if needed
          createdAt: { $first: "$createdAt" }, // Include createdAt for sorting
          order_type: { $first: "$order_type" },
          user_wallet_id: { $first: "$user_wallet_id" },
          loyality_coins: { $first: "$loyality_coins" },
          prescription_url: { $first: "$prescription_url" },
        },
      },
      {
        $project: {
          _id: 1,
          productDetails: 1,
          user: 1,
          address: 1,
          total: 1,
          status: 1,
          subTotal: 1,
          order_type: 1,
          user_wallet_id: 1,
          loyality_coins: 1,
          prescription_url: 1,
          shippingCost: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: sortOrder }, // Sort by createdAt
      },
      {
        $skip: skip, // Pagination skip
      },
      {
        $limit: pageSize, // Pagination limit
      },
    ];

    // Execute the main pipeline to get the orders
    const orders = await Order.aggregate(pipeline);

    const getTotalSale = orders.reduce(function (a, b) {
      return a + b["total"];
    }, 0);

    // Count total matching orders (for pagination)
    const totalCountPipeline = [
      { $match: { ...matchConditions } },
      { $count: "totalCount" }, // Count total orders matching the date filter
    ];

    const totalCountResult = await Order.aggregate(totalCountPipeline);
    const totalItems = totalCountResult[0] ? totalCountResult[0].totalCount : 0;
    const totalPages = Math.ceil(totalItems / pageSize); // Calculate total pages

    res.status(200).send({
      orders, // Actual order data
      grandTotal: getTotalSale, // Total number of pages
      currentPage: currentPage, // Current page
      limit: pageSize, // Items per page
      totalItems: totalItems, // Total number of items
      totalPages: totalPages,
    });
  } catch (error) {
    console.log("Error in salesReport:", error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

// Get all orders by loggedIn user
exports.findOrdersByUserId = async (req, res) => {
  try {
    // Retrieve pagination and filter parameters from query
    const { page = 1, limit = 10, period = "3months" } = req.query;
    // Convert query parameters to numbers
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    // Calculate date range based on period
    const currentDate = new Date();
    let startDate;

    switch (period) {
      case "monthly":
        startDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        break;
      case "3months":
        startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 3));
        break;
      case "6months":
        startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 6));
        break;
      default:
      // startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 3)); // Default to 3 months
    }

    // Fetch orders with pagination and date range filter
    const orders = await Order.find({
      user_id: req.params.user_id,
      createdAt: { $gte: startDate },
    })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // Count total orders for pagination
    const totalOrders = await Order.countDocuments({
      user_id: req.params.user_id,
      createdAt: { $gte: startDate },
    });

    // Process each order
    const processedOrders = await Promise.all(
      orders.map(async (order) => {
        // Process each product in the order
        const processedProducts = await Promise.all(
          order.products.map(async (product) => {
            // Fetch product details
            const productDetails = await Product.findOne({
              _id: product.product_id,
            }).lean();
            // Fetch product variant details
            const productVariantDetails = await ProductVariant.findOne({
              _id: product.product_variant_id,
              productId: product.product_id,
            }).lean();
            // Assemble the response format
            return {
              product: {
                _id: productDetails._id,
                title: productDetails.title,
                description: productDetails.description,
                consume_type: productDetails.consume_type,
                return_policy: productDetails.return_policy,
                product_category_id: productDetails.product_category_id,
                brand_id: productDetails.brand_id,
                expiry_date: productDetails.expiry_date,
                manufacturing_date: productDetails.manufacturing_date,
                sideEffects: productDetails.sideEffects,
              },
              product_variant: {
                _id: productVariantDetails._id,
                productId: productVariantDetails.productId,
                discounted_id: productVariantDetails.discounted_id,
                size: productVariantDetails.size,
                color: productVariantDetails.color,
                price: productVariantDetails.price,
              },
              media_id: product.media_id,
              quantity: product.quantity,
              price: product.price,
              _id: product._id,
            };
          })
        );

        return {
          ...order,
          products: processedProducts,
        };
      })
    );

    // Send the response with pagination info
    res.send({
      orders: processedOrders,
      currentPage: pageNumber,
      limit: pageSize,
      totalItems: totalOrders,
      totalPages: Math.ceil(totalOrders / pageSize),
      error: false,
    });
  } catch (error) {
    // Error handling
    handleError(error.message, 400, res);
  }
};

// Get order detail by Order ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return handleError("Invalid Order ID format", 400, res);
    }

    // Fetch the order by its ID and populate necessary fields
    const order = await Order.findOne({ _id: id }).lean();

    if (!order) {
      return res.status(404).send({ message: "Order not found" });
    }

    // Process each product in the order
    const processedProducts = await Promise.all(
      order.products.map(async (product) => {
        // Fetch product details
        const productDetails = await Product.findOne({
          _id: product.product_id,
        }).lean();
        // Fetch product variant details
        const productVariantDetails = await ProductVariant.findOne({
          _id: product.product_variant_id,
          productId: product.product_id,
        }).lean();

        return {
          product: {
            _id: productDetails._id,
            title: productDetails.title,
            description: productDetails.description,
            consume_type: productDetails.consume_type,
            return_policy: productDetails.return_policy,
            product_category_id: productDetails.product_category_id,
            brand_id: productDetails.brand_id,
            expiry_date: productDetails.expiry_date,
            manufacturing_date: productDetails.manufacturing_date,
            sideEffects: productDetails.sideEffects,
          },
          product_variant: {
            _id: productVariantDetails._id,
            productId: productVariantDetails.productId,
            discounted_id: productVariantDetails.discounted_id,
            size: productVariantDetails.size,
            color: productVariantDetails.color,
            price: productVariantDetails.price,
          },
          media_id: product.media_id,
          quantity: product.quantity,
          price: product.price,
          _id: product._id,
        };
      })
    );

    // Construct the detailed order response
    const detailedOrder = {
      _id: order._id,
      user_id: order.user_id,
      address_id: order.address_id,
      products: processedProducts,
      subTotal: order.subTotal,
      shippingCost: order.shippingCost,
      total: order.total,
      status: order.status,
      order_type: order.order_type,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      __v: order.__v,
    };

    // Send the detailed order response
    handleResponse(
      res,
      detailedOrder,
      "Retrieve Order data successfully.",
      200
    );
  } catch (error) {
    handleError(error.message, 400, res);
  }
};

// Order cancell by logIn user
exports.cancelledOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return handleError("Invalid Order ID format", 400, res);
    }

    const order = await Order.findOne({ _id: id, user_id: req.user._id });

    await Promise.all(
      order?.products?.map(async (product) => {
        const inventory = await Inventory.findOne({
          product_id: product.product_id,
          product_variant_id: product.product_variant_id,
        });

        await Inventory.updateOne(
          {
            product_id: product.product_id,
            product_variant_id: product.product_variant_id,
          },
          {
            sale_variant_quantity:
              inventory.sale_variant_quantity - product.quantity,
          },
          { new: true }
        );
      })
    );

    if (!order) {
      handleError("Invailid order ID.", 400, res);
      return;
    }

    await Order.updateOne(
      { _id: order._id },
      { status: "cancelled" },
      { new: true }
    );

    res.status(200).send({
      message: "Order has been successfully cancelled.",
      error: false,
    });
  } catch (error) {
    handleError(error.message, 400, res);
  }
};

// Manage order status by admin panel
exports.handleOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return handleError("Invalid Order ID format", 400, res);
    }

    const { status } = req.body;
    const order = await Order.findOne({ _id: id });

    if (!order) {
      handleError("Invailid order ID.", 400, res);
      return;
    }

    if (status === "cancelled") {
      await Promise.all(
        order?.products?.map(async (product) => {
          const inventory = await Inventory.findOne({
            product_id: product.product_id,
            product_variant_id: product.product_variant_id,
          });
          await Inventory.updateOne(
            {
              product_id: product.product_id,
              product_variant_id: product.product_variant_id,
            },
            {
              sale_variant_quantity:
                inventory.sale_variant_quantity - product.quantity,
            },
            { new: true }
          );
        })
      );
    }

    await Order.updateOne(
      { _id: order._id },
      { status: status },
      { new: true }
    );

    const user = await User.findOne({ _id: order.user_id });

    const subject = `Your order is ${status}`;
    const message = orderNotifiationEmail(
      user.name,
      Order._id,
      order.subTotal,
      order.shipping_charge,
      order.total,
      order.order_type,
      status
    );
    sendMailer(user.email, subject, message, res);

    res
      .status(200)
      .send({ message: `Order has been successfully ${status}`, error: false });
  } catch (error) {
    handleError(error.message, 400, res);
  }
};

// Admin can get all users orders list
exports.findAllUserOrders = async (req, res) => {
  try {
    // Retrieve pagination and filter parameters from query
    const { page = 1, limit = 10, period = "3months" } = req.query;

    // Convert query parameters to numbers
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    // Calculate date range based on period
    const currentDate = new Date();
    let startDate;

    switch (period) {
      case "monthly":
        startDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        break;
      case "3months":
        startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 3));
        break;
      case "6months":
        startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 6));
        break;
      default:
        startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 3)); // Default to 3 months
    }

    // Fetch orders with pagination and date range filter
    const orders = await Order.find({ user_id: req.user._id })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // Count total orders for pagination
    const totalOrders = await Order.countDocuments({
      user_id: req.user._id,
      // createdAt: { $gte: startDate }
    });

    // Process each order
    const processedOrders = await Promise.all(
      orders.map(async (order) => {
        // Process each product in the order
        const processedProducts = await Promise.all(
          order.products.map(async (product) => {
            // Fetch product details
            const productDetails = await Product.findOne({
              _id: product.product_id,
            }).lean();
            // Fetch product variant details
            const productVariantDetails = await ProductVariant.findOne({
              _id: product.product_variant_id,
              productId: product.product_id,
            }).lean();

            // Assemble the response format
            return {
              product: {
                _id: productDetails._id,
                title: productDetails.title,
                description: productDetails.description,
                consume_type: productDetails.consume_type,
                return_policy: productDetails.return_policy,
                product_category_id: productDetails.product_category_id,
                brand_id: productDetails.brand_id,
                expiry_date: productDetails.expiry_date,
                manufacturing_date: productDetails.manufacturing_date,
                sideEffects: productDetails.sideEffects,
              },
              product_variant: {
                _id: productVariantDetails._id,
                productId: productVariantDetails.productId,
                discounted_id: productVariantDetails.discounted_id,
                size: productVariantDetails.size,
                color: productVariantDetails.color,
                price: productVariantDetails.price,
              },
              media_id: product.media_id,
              quantity: product.quantity,
              price: product.price,
              _id: product._id,
            };
          })
        );

        return {
          ...order,
          products: processedProducts,
        };
      })
    );

    // Send the response with pagination info
    res.send({
      orders: processedOrders,
      currentPage: pageNumber,
      limit: pageSize,
      totalItems: totalOrders,
      totalPages: Math.ceil(totalOrders / pageSize),
    });
  } catch (error) {
    // Error handling
    handleError(error.message, 400, res);
  }
};

// Get sales report for admin pannel
/**
 * * Step 1 ->  Get all products data and calculate all product varient price total.
 * Step 2 ->   Calculate all delivered order total
 * Step 3 ->   Get deference between all inventory calculate and order sales total
 * Step 4 ->
 *
 * Expected result in below here
 *
 * | Product tital | brand_name | category_name | variant price | order_variant_price | order_varient_size | order_sale_variant_qty | order_status | order_date
 *
 * ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * total , total sale
 * ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 *
 */

exports.salesReport = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      sort = 1,
      startDate,
      endDate,
      status,
    } = req.query;

    // Parse page and limit to integers
    const currentPage = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    // Calculate skip for pagination
    const skip = (currentPage - 1) * pageSize;
    const sortOrder = sort === "1" ? 1 : -1;

    // Initialize match condition for date range
    const matchConditions = {};
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        // Convert startDate to UTC at 00:00 UTC
        matchConditions.createdAt.$gte = new Date(
          new Date(startDate).setUTCHours(0, 0, 0, 0)
        );
      }
      if (endDate) {
        // Convert endDate to UTC at 23:59 UTC
        matchConditions.createdAt.$lte = new Date(
          new Date(endDate).setUTCHours(23, 59, 59, 999)
        );
      }
    }
    if (status) {
      matchConditions.status = status; // Add status to match conditions
    }

    // Log match conditions for debugging
    console.log("Match Conditions: ", matchConditions);

    // Pipeline for the aggregation
    const pipeline = [
      // Match orders within the specified date range
      {
        $match: {
          ...matchConditions,
        },
      },
      {
        $lookup: {
          from: "users", // Lookup user details
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "addressbooks", // Lookup address details
          localField: "address_id",
          foreignField: "_id",
          as: "address",
        },
      },
      {
        $unwind: { path: "$address", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$products" }, // Unwind products to handle each product separately
      },
      {
        $lookup: {
          from: "products", // Lookup product details
          localField: "products.product_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true },
      },
      {
        // Lookup to get brand details
        $lookup: {
          from: "brands", // Assuming your brand collection is called 'brands'
          localField: "productDetails.brand_id",
          foreignField: "_id",
          as: "brandDetails",
        },
      },
      {
        $unwind: { path: "$brandDetails", preserveNullAndEmptyArrays: true },
      },
      {
        // Lookup to get product category details
        $lookup: {
          from: "productcategories", // Assuming your product category collection is called 'productcategories'
          localField: "productDetails.product_category_id",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "variants", // Lookup variant details
          localField: "products.product_variant_id",
          foreignField: "_id",
          as: "variantDetails",
        },
      },
      {
        $unwind: { path: "$variantDetails", preserveNullAndEmptyArrays: true },
      },
      {
        // Group by order id and gather order details
        $group: {
          _id: "$_id", // Group by order id
          productDetails: {
            $push: {
              _id: "$productDetails._id",
              title: "$productDetails.title",
              sku: "$productDetails.sku",
              brand_name: "$brandDetails.name", // Brand name
              category_name: "$categoryDetails.name", // Category name
              variantDetails: {
                _id: "$variantDetails._id",
                size: "$variantDetails.size",
                color: "$variantDetails.color",
                discount: "$variantDetails.discounted_id",
                price: "$products.price", // Use products.price for bought price
                quantity: "$products.quantity", // Use products.quantity for quantity bought
              },
            },
          },
          user: {
            $first: {
              name: "$user.name",
              email: "$user.email",
            },
          },
          address: {
            $first: {
              bill_to: "$address.bill_to",
              address: "$address.address",
              land_mark: "$address.land_mark",
              state: "$address.state",
              city: "$address.city",
              pincode: "$address.pincode",
              address_type: "$address.address_type",
            },
          },
          total: { $first: "$total" }, // Include total if needed
          createdAt: { $first: "$createdAt" }, // Include createdAt for sorting
          order_type: { $first: "$order_type" },
          user_wallet_id: { $first: "$user_wallet_id" },
          loyality_coins: { $first: "$loyality_coins" },
        },
      },
      {
        $project: {
          _id: 1,
          productDetails: 1,
          user: 1,
          address: 1,
          total: 1,
          createdAt: 1,
          order_type: 1,
          user_wallet_id: 1,
          loyality_coins: 1,
        },
      },
      {
        $sort: { createdAt: sortOrder }, // Sort by createdAt before pagination
      },
      {
        $skip: skip, // Apply pagination skip
      },
      {
        $limit: pageSize, // Apply pagination limit
      },
    ];

    // Execute the main pipeline to get the orders
    const orders = await Order.aggregate(pipeline);

    // Initialize daily sales report
    let dailySalesReport = [];

    // If there are orders, proceed to calculate daily sales
    if (orders.length > 0) {
      const salesMap = {};

      orders.forEach((order) => {
        const orderDate = order.createdAt.toISOString().split("T")[0]; // Extract the date
        if (!salesMap[orderDate]) {
          salesMap[orderDate] = {
            totalOrders: 0,
            totalRevenue: 0,
          };
        }
        salesMap[orderDate].totalOrders += 1;
        salesMap[orderDate].totalRevenue += order.total; // Aggregate revenue
      });

      dailySalesReport = Object.keys(salesMap).map((date) => ({
        _id: date,
        totalOrders: salesMap[date].totalOrders,
        totalRevenue: salesMap[date].totalRevenue,
      }));

      dailySalesReport.sort((a, b) => new Date(a._id) - new Date(b._id));
    }

    // Calculate grand total revenue across all orders for the specified date range
    const grandTotalPipeline = [
      {
        $match: {
          ...matchConditions,
        },
      },
      {
        $group: {
          _id: null,
          grandTotal: { $sum: "$total" }, // Sum total from all matching orders
        },
      },
    ];

    const grandTotalResult = await Order.aggregate(grandTotalPipeline);
    const grandTotal = grandTotalResult[0] ? grandTotalResult[0].grandTotal : 0;

    // Count total matching orders (for pagination)
    const totalCountPipeline = [
      { $match: { ...matchConditions } },
      { $count: "totalCount" }, // Count total orders matching the date filter
    ];

    const totalCountResult = await Order.aggregate(totalCountPipeline);
    const totalItems = totalCountResult[0] ? totalCountResult[0].totalCount : 0;
    const totalPages = Math.ceil(totalItems / pageSize); // Calculate total pages

    res.status(200).send({
      orders, // Actual order data
      dailySalesReport, // Daily sales report
      grandTotal, // Grand total revenue
      currentPage: currentPage, // Current page
      limit: pageSize, // Items per page
      totalItems: totalItems, // Total number of items
      totalPages: totalPages,
    });
  } catch (error) {
    console.log("Error in salesReport:", error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

exports.checkout = async (req, res) => {
  var razorPayIinstance = new Razorpay({
    key_id: "rzp_test_GcZZFDPP0jHtC4",
    key_secret: "6JdtQv2u7oUw7EWziYeyoewJ",
  });

  const options = {
    amount: req.body.amount * 100,
    currency: "INR",
    receipt: "reciept#1",
    payment_capture: 1,
  };
  try {
    const response = await razorPayIinstance.orders.create(options);

    res.send({
      order_id: response.id,
      currency: response.currency,
      amount: response.amount,
    });
  } catch (error) {
    res.send({ error: true, message: error.message });
  }
};

exports.payment = async (req, res) => {
  const { paymentId } = req.params;
  const razorpay = new Razorpay({
    key_id: "rzp_test_GcZZFDPP0jHtC4",
    key_secret: "6JdtQv2u7oUw7EWziYeyoewJ",
  });

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    if (!payment) {
      return res.status(500).json("Error at razorpay loading");
    }

    res.json({
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
    });
  } catch (error) {
    res.status(500).json("failed to fetch");
  }
};

exports.getAllPayments = async (req, res) => {
  const razorpay = new Razorpay({
    key_id: "rzp_test_GcZZFDPP0jHtC4",
    key_secret: "6JdtQv2u7oUw7EWziYeyoewJ",
  });

  try {
    // Fetch all payments
    const payments = await razorpay.payments.all();

    // Check if payments are available
    if (!payments || !payments.items || payments.items.length === 0) {
      return res.status(404).json("No payments found");
    }

    // Example of sending the first payment's details (adjust as necessary)
    const payment = payments.items.map((item) => ({
      status: item.status,
      method: item.method,
      amount: item.amount / 100,
      currency: item.currency,
    }));

    res.send({ payment });

    // res.json({
    //     status: payment.status,
    //     method: payment.method,
    //     amount: payment.amount / 100,
    //     currency: payment.currency,
    // });
  } catch (error) {
    console.error("Error fetching payments:", error); // Log the error for debugging
    res
      .status(500)
      .json({ message: "Failed to fetch payments", error: error.message });
  }
};

// --------------------------------------------- Generate Oder Invoice ------------------------------------------------------//

// Checked this is working fine
exports.downloadInvoice = async (req, res) => {
  try {
    const { orderID } = req.params;
    const order = await Order.findOne({ _id: orderID, userID: req.user?.id });
    if (!order) {
      return res.status(404).send("Order not found");
    }

    const user = await User.findOne({ _id: order.user_id });
    const address = await AddressBook.findOne({ _id: order.address_id });

    const orderItems = await Promise.all(
      order.products.map(async (item) => {
        const product = await Product.findOne({ _id: item.product_id });
        const variant = await ProductVariant.findOne({
          _id: item.product_variant_id,
          productId: item.product_id,
        });

        product._doc.variant = variant;

        return {
          itemName: product.title,
          quantity: item.quantity,
          price: item.price,
        };
      })
    );

    const invoiceData = {
      orderId: order._id,
      customerName: user?.name,
      customerEmail: user?.email,
      customerMobile: user?.mobile,

      address: {
        address: address.address,
        state: address.state,
        city: address.city,
        pincode: address.pincode,
      },
      subTotal: order.subTotal,
      shipping_charge: order.shippingCost,
      grandTotal: order.total,
      orderItems: orderItems,
      invoiceDate: order.createdAt,
      
      // Add taxes and redeem coin discount fields here
      taxes: order.taxes || 0,  // Assuming taxes are stored in the order
      redeemCoinDiscount: order.loyality_coins
    };

    // Call the generateInvoice function and pass the response object
    await newGenerateInvoice(invoiceData, res);
  } catch (error) {
    console.error("Error generating invoice:", error);
    handleError(error, 400, res);
  }
};

// --------------------------------------------- End of generate Oder Invoice ------------------------------------------------------//
//

