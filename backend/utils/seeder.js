const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
dotenv.config();

const User = require('../models/User');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Client = require('../models/Client');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB for seeding...');

  // Clear
  await Promise.all([User.deleteMany(), Product.deleteMany(), Supplier.deleteMany(), Client.deleteMany()]);
  console.log('Collections cleared');

  // Users
  await User.create([
    { username: 'admin', password: 'Admin123!', firstName: 'Super', lastName: 'Admin', email: 'admin@pharmaerp.dz', role: 'super_admin', module: 'global' },
    { username: 'pharmacist', password: 'Pharma123!', firstName: 'Fatima', lastName: 'Benali', email: 'pharma@pharmaerp.dz', role: 'pharmacist', module: 'pharmacy' },
  ]);
  console.log('✅ Users created');

  // Suppliers
  const suppliers = await Supplier.create([
    { name: 'Pharmax SARL', code: 'SUPP0001', contact: { name: 'Mohamed Khelif', phone: '+213 21 234 567', email: 'contact@pharmax.dz' }, deliveryDelay: 3, paymentTerms: 30, qualityScore: 96 },
    { name: 'MedDistrib', code: 'SUPP0002', contact: { name: 'Karim Bouazza', phone: '+213 21 345 678', email: 'info@meddistrib.dz' }, deliveryDelay: 2, paymentTerms: 60, qualityScore: 91 },
    { name: 'Saidal Group', code: 'SUPP0003', contact: { name: 'DG Saidal', phone: '+213 21 456 789', email: 'commercial@saidal.dz' }, deliveryDelay: 1, paymentTerms: 30, qualityScore: 78 },
  ]);
  console.log('✅ Suppliers created');

  // Products
  const expiry2026 = new Date('2026-12-31');
  const expiry2027 = new Date('2027-06-30');
  const expiryShort = new Date('2025-06-30');

  await Product.create([
    { name: 'Paracétamol 1g', activeIngredient: 'Paracétamol', atcCode: 'N02BE01', barcode: '3400936812726', form: 'comprimé', dosage: '1000mg', packaging: 'Boîte de 16', category: 'antalgique', requiresPrescription: false, lots: [{ lotNumber: 'A2501', expiryDate: expiry2026, quantity: 1840 }], stock: 1840, minStock: 200, maxStock: 3000, purchasePrice: 85, wholesalePrice: 120, retailPrice: 180, supplier: suppliers[0]._id },
    { name: 'Amoxicilline 500mg', activeIngredient: 'Amoxicilline', atcCode: 'J01CA04', barcode: '3400936800007', form: 'gélule', dosage: '500mg', packaging: 'Boîte de 12', category: 'antibiotique', requiresPrescription: true, lots: [], stock: 0, minStock: 100, maxStock: 800, purchasePrice: 180, wholesalePrice: 250, retailPrice: 350, supplier: suppliers[0]._id },
    { name: 'Ibuprofène 400mg', activeIngredient: 'Ibuprofène', atcCode: 'M01AE01', barcode: '3400936812740', form: 'comprimé', dosage: '400mg', packaging: 'Boîte de 20', category: 'antalgique', requiresPrescription: false, lots: [{ lotNumber: 'C2502', expiryDate: expiry2026, quantity: 12 }], stock: 12, minStock: 50, maxStock: 500, purchasePrice: 120, wholesalePrice: 170, retailPrice: 240, supplier: suppliers[1]._id },
    { name: 'Metformine 850mg', activeIngredient: 'Metformine', atcCode: 'A10BA02', barcode: '3400936812757', form: 'comprimé', dosage: '850mg', packaging: 'Boîte de 30', category: 'diabète', requiresPrescription: true, lots: [{ lotNumber: 'D2503', expiryDate: expiry2027, quantity: 654 }], stock: 654, minStock: 150, maxStock: 1000, purchasePrice: 95, wholesalePrice: 130, retailPrice: 185, supplier: suppliers[2]._id },
    { name: 'Oméprazole 20mg', activeIngredient: 'Oméprazole', atcCode: 'A02BC01', barcode: '3400936812764', form: 'gélule', dosage: '20mg', packaging: 'Boîte de 28', category: 'gastroentérologie', requiresPrescription: false, lots: [{ lotNumber: 'E2501', expiryDate: expiry2026, quantity: 487 }], stock: 487, minStock: 100, maxStock: 800, purchasePrice: 110, wholesalePrice: 155, retailPrice: 220, supplier: suppliers[0]._id },
    { name: 'Losartan 50mg', activeIngredient: 'Losartan potassique', atcCode: 'C09CA01', barcode: '3400936812771', form: 'comprimé', dosage: '50mg', packaging: 'Boîte de 30', category: 'cardiovasculaire', requiresPrescription: true, lots: [{ lotNumber: 'F2502', expiryDate: expiry2027, quantity: 312 }], stock: 312, minStock: 100, maxStock: 600, purchasePrice: 145, wholesalePrice: 200, retailPrice: 280, supplier: suppliers[1]._id },
    { name: 'Atorvastatine 40mg', activeIngredient: 'Atorvastatine calcique', atcCode: 'C10AA05', barcode: '3400936812788', form: 'comprimé', dosage: '40mg', packaging: 'Boîte de 30', category: 'cardiovasculaire', requiresPrescription: true, lots: [{ lotNumber: 'G2503', expiryDate: expiry2027, quantity: 234 }], stock: 234, minStock: 80, maxStock: 500, purchasePrice: 210, wholesalePrice: 290, retailPrice: 410, supplier: suppliers[2]._id },
    { name: 'Doliprane 1g ×8', activeIngredient: 'Paracétamol', atcCode: 'N02BE01', barcode: '3400936812795', form: 'suppositoire', dosage: '1000mg', packaging: 'Boîte de 8', category: 'antalgique', requiresPrescription: false, lots: [{ lotNumber: 'H2201', expiryDate: expiryShort, quantity: 48 }], stock: 48, minStock: 100, maxStock: 600, purchasePrice: 75, wholesalePrice: 105, retailPrice: 150, supplier: suppliers[0]._id },
    { name: 'Amoxicilline 1g', activeIngredient: 'Amoxicilline', atcCode: 'J01CA04', barcode: '3400936812801', form: 'comprimé', dosage: '1000mg', packaging: 'Boîte de 8', category: 'antibiotique', requiresPrescription: true, lots: [{ lotNumber: 'I2504', expiryDate: expiry2027, quantity: 380 }], stock: 380, minStock: 100, maxStock: 700, purchasePrice: 220, wholesalePrice: 310, retailPrice: 440, supplier: suppliers[0]._id },
    { name: 'Metformine 1g', activeIngredient: 'Metformine', atcCode: 'A10BA02', barcode: '3400936812818', form: 'comprimé', dosage: '1000mg', packaging: 'Boîte de 30', category: 'diabète', requiresPrescription: true, lots: [{ lotNumber: 'J2502', expiryDate: expiry2026, quantity: 78 }], stock: 78, minStock: 100, maxStock: 600, purchasePrice: 105, wholesalePrice: 145, retailPrice: 205, supplier: suppliers[2]._id },
  ]);
  console.log('✅ Products created');

  // Clients
  await Client.create([
    { firstName: 'Fatima', lastName: 'Boudali', phone: '0555123456', email: 'fatima.b@email.com', loyaltyPoints: 2840, loyaltyLevel: 'or', totalSpent: 284000, totalPurchases: 47, chronicConditions: ['Hypertension'], lastVisit: new Date() },
    { firstName: 'Mohamed', lastName: 'Cherif', phone: '0661789012', email: 'moh.c@email.com', loyaltyPoints: 1120, loyaltyLevel: 'argent', totalSpent: 112000, totalPurchases: 23, chronicConditions: ['Diabète type 2'], lastVisit: new Date(Date.now() - 86400000) },
    { firstName: 'Yasmine', lastName: 'Kaci', phone: '0770345678', loyaltyPoints: 340, loyaltyLevel: 'bronze', totalSpent: 34000, totalPurchases: 8, lastVisit: new Date(Date.now() - 3*86400000) },
    { firstName: 'Karim', lastName: 'Meziane', phone: '0551234567', loyaltyPoints: 890, loyaltyLevel: 'argent', totalSpent: 89000, totalPurchases: 19, chronicConditions: ['Asthme'], lastVisit: new Date(Date.now() - 7*86400000) },
  ]);
  console.log('✅ Clients created');

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('─────────────────────────────────');
  console.log('Comptes de connexion:');
  console.log('  admin / Admin123!        (Super Admin)');
  console.log('  pharmacist / Pharma123!  (Pharmacien)');
  console.log('─────────────────────────────────');

  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
