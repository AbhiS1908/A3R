const VendorProductEntry = require('../models/vendorProductEntryModel');
const VendorStockDetails = require('../models/vendorStockDetailsModel');

// Add a new product entry
exports.addProductEntry = async (req, res) => {
    try {
        const { vendorStockDetailsId, productInfo, quantity } = req.body;

        // Fetch the vendorStockDetails document
        const vendorStockDetails = await VendorStockDetails.findById(vendorStockDetailsId);
        if (!vendorStockDetails) {
            return res.status(404).json({ message: 'vendorStockDetails not found' });
        }

        // Map productInfo to the corresponding index in finalPrices array
        let ratePerKg;
        switch (productInfo) {
            case '6 sutta':
                ratePerKg = vendorStockDetails.finalPrices[0]; // 1st value
                break;
            case '5 sutta':
                ratePerKg = vendorStockDetails.finalPrices[1]; // 2nd value
                break;
            case '4 sutta':
                ratePerKg = vendorStockDetails.finalPrices[2]; // 3rd value
                break;
            case '3 sutta':
                ratePerKg = vendorStockDetails.finalPrices[3]; // 4th value
                break;
            case 'others':
                ratePerKg = vendorStockDetails.finalPrices[4]; // 5th value
                break;
            case 'waste':
                ratePerKg = vendorStockDetails.finalPrices[5]; // 6th value
                break;
            default:
                return res.status(400).json({ message: 'Invalid productInfo value' });
        }

        // Check if ratePerKg is available
        if (ratePerKg === undefined) {
            return res.status(400).json({ message: 'No rate available for the given productInfo' });
        }

        // Save the new product entry
        const newEntry = new VendorProductEntry({
            vendorStockDetailsId,
            productInfo,
            ratePerKg,
            quantity
        });

        await newEntry.save();

        // Update the appropriate weight field in vendorStockDetails based on productInfo
        let updateFields = {};
        switch (productInfo) {
            case '6 sutta':
                updateFields.weight1 = quantity;
                break;
            case '5 sutta':
                updateFields.weight2 = quantity;
                break;
            case '4 sutta':
                updateFields.weight3 = quantity;
                break;
            case '3 sutta':
                updateFields.weight4 = quantity;
                break;
            case 'others':
                updateFields.weight5 = quantity;
                break;
            case 'waste':
                updateFields.weight6 = quantity;
                break;
        }

        // Update the vendorStockDetails document with the new weight field
        await VendorStockDetails.findByIdAndUpdate(vendorStockDetailsId, updateFields);

        res.status(201).json({ message: 'Product entry added successfully', newEntry });
    } catch (error) {
        res.status(500).json({ message: 'Error adding product entry', error });
    }
};

exports.getProductByVendorStockId = async (req, res) => {
    try {
        const { vendorStockDetailsId } = req.params;

        // Fetch all product entries related to the given vendorStockDetailsId
        const vendorSegregate = await VendorProductEntry.find({ vendorStockDetailsId })
            .populate('vendorStockDetailsId');

        if (!vendorSegregate || vendorSegregate.length === 0) {
            return res.status(404).json({ error: 'No product entries found for this vendorStockDetails ID' });
        }

        // Map the data to extract only required fields and calculate totalCost dynamically
        const formattedData = vendorSegregate.map(stock => ({
            _id: stock._id,
            vendorStockDetailsId: stock.vendorStockDetailsId ? stock.vendorStockDetailsId._id : null,
            productInfo: stock.productInfo,
            ratePerKg: stock.ratePerKg,
            quantity: stock.quantity,
            totalCost: stock.ratePerKg * stock.quantity, // Dynamically calculate totalCost
        }));

        res.status(200).json(formattedData);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching product entries', details: error.message });
    }
};


// Calculate and update totalMaterialCost and totalMaterialWeight
exports.calculateTotals = async (req, res) => {
    try {
        const { vendorStockDetailsId } = req.params;

        // Find all product entries linked to the given vendorStockDetails ID
        const productEntries = await VendorProductEntry.find({ vendorStockDetailsId });

        if (!productEntries.length) {
            return res.status(404).json({ message: 'No product entries found for this vendorStockDetails ID' });
        }

        // Calculate totals
        const totalMaterialCost = parseFloat(productEntries.reduce((sum, entry) => sum + entry.totalCost, 0).toFixed(2));
        const totalMaterialWeight = parseFloat(productEntries.reduce((sum, entry) => sum + entry.quantity, 0).toFixed(2));

        // Update vendorStockDetails
        await VendorStockDetails.findByIdAndUpdate(vendorStockDetailsId, {
            totalMaterialCost,
            totalMaterialWeight
        });

        res.status(200).json({ message: 'Totals calculated and updated', totalMaterialCost, totalMaterialWeight });
    } catch (error) {
        res.status(500).json({ message: 'Error calculating totals', error });
    }
};

exports.updateVendorProductEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { productInfo, quantity } = req.body;

        // Find the product entry
        const productEntry = await VendorProductEntry.findById(id);
        if (!productEntry) {
            return res.status(404).json({ message: 'Product entry not found' });
        }

        // Fetch the vendorStockDetails document
        const vendorStockDetails = await VendorStockDetails.findById(productEntry.vendorStockDetailsId);
        if (!vendorStockDetails) {
            return res.status(404).json({ message: 'vendorStockDetails not found' });
        }

        // Update the appropriate weight field in vendorStockDetails based on productInfo
        let updateFields = {};
        if (productInfo === '6 sutta') {
            updateFields.weight1 = quantity;
        } else if (productInfo === '5 sutta') {
            updateFields.weight2 = quantity;
        } else if (productInfo === '4 sutta') {
            updateFields.weight3 = quantity;
        } else if (productInfo === '3 sutta') {
            updateFields.weight4 = quantity;
        } else if (productInfo === 'others') {
            updateFields.weight5 = quantity;
        } else if (productInfo === 'waste') {
            updateFields.weight6 = quantity;
        }

        // Update the product entry
        if (productInfo) productEntry.productInfo = productInfo;
        if (quantity !== undefined) productEntry.quantity = quantity;

        // Recalculate total cost
        productEntry.totalCost = productEntry.ratePerKg * productEntry.quantity;

        await productEntry.save();

        // Update the vendorStockDetails document
        await VendorStockDetails.findByIdAndUpdate(productEntry.vendorStockDetailsId, updateFields);

        res.status(200).json({ message: 'Product entry updated successfully', productEntry });
    } catch (error) {
        res.status(500).json({ message: 'Error updating product entry', error });
    }
};

// Delete a product entry
exports.deleteVendorProductEntry = async (req, res) => {
    try {
        const { id } = req.params;

        // Find and delete the product entry
        const productEntry = await VendorProductEntry.findByIdAndDelete(id);
        if (!productEntry) {
            return res.status(404).json({ message: 'Product entry not found' });
        }

        res.status(200).json({ message: 'Product entry deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting product entry', error });
    }
};
