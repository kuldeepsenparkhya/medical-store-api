const mongoose = require('mongoose');
const { DB_URI } = require('../config/config');

// Ensure the URI is correct
if (!DB_URI) {
  console.error('DB_URI is not defined in the configuration.');
  process.exit(1);
}

mongoose.connect(DB_URI, {
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // Adjust timeout as needed
})
  .then(() => console.log('Db connection done'))
  .catch(error => {
    console.error('Error connecting to the database:', error);
    process.exit(1); // Exit the process if the connection fails
  });

const db = {
  User: require('./user'),
  AddressBook: require('./addressBook'),
  Brand: require('./brand'),
  ProductCategory: require('./category'),
  HealthCategory: require('./healthCategory'),

  Product: require('./product'),
  Media: require('./media'),
  WishList: require('./wishList'),
  AddToCart: require('./addToCart'),
  ProductVariant: require('./variant'),
  Brochure: require('./brochure'),
  Prescription: require('./prescription'),


  Order: require('./order'),
  Discount: require('./discount'),

  Inventory: require('./inventory'),

  Document: require('./document'),
  Transaction: require('./transaction'),

  // Loyality program
  UserWallet: require('./userVollet'), //For user vollet coins
  Coin: require('./coin'),
  // LoyaltyRange: require('./loyaltyRange'),

  // Offer discount 
  Offer: require('./offer'),
  ComboProduct: require('./comboProduct')

};

module.exports = db;
