const FarmerProductEntry = require('../models/farmerProductEntryModel');
const FarmerStockDetails = require('../models/farmerStockDetailsModel');

// Add a new product entry
exports.addProductEntry = async (req, res) => {
    try {
        const { farmerStockDetailsId, productInfo, quantity } = req.body;

        // Fetch the farmerStockDetails document
        const farmerStockDetails = await FarmerStockDetails.findById(farmerStockDetailsId);
        if (!farmerStockDetails) {
            return res.status(404).json({ message: 'farmerStockDetails not found' });
        }

        // Map productInfo to the corresponding index in finalPrices array
        let ratePerKg;
        switch (productInfo) {
            case '6 sutta':
                ratePerKg = farmerStockDetails.finalPrices[0]; // 1st value
                break;
            case '5 sutta':
                ratePerKg = farmerStockDetails.finalPrices[1]; // 2nd value
                break;
            case '4 sutta':
                ratePerKg = farmerStockDetails.finalPrices[2]; // 3rd value
                break;
            case '3 sutta':
                ratePerKg = farmerStockDetails.finalPrices[3]; // 4th value
                break;
            case 'others':
                ratePerKg = farmerStockDetails.finalPrices[4]; // 5th value
                break;
            case 'waste':
                ratePerKg = farmerStockDetails.finalPrices[5]; // 6th value
                break;
            default:
                return res.status(400).json({ message: 'Invalid productInfo value' });
        }

        // Check if ratePerKg is available
        if (ratePerKg === undefined) {
            return res.status(400).json({ message: 'No rate available for the given productInfo' });
        }

        // Save the new product entry
        const newEntry = new FarmerProductEntry({
            farmerStockDetailsId,
            productInfo,
            ratePerKg,
            quantity
        });

        await newEntry.save();

        // Update the appropriate weight field in farmerStockDetails based on productInfo
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

        // Update the farmerStockDetails document with the new weight field
        await FarmerStockDetails.findByIdAndUpdate(farmerStockDetailsId, updateFields);

        res.status(201).json({ message: 'Product entry added successfully', newEntry });
    } catch (error) {
        res.status(500).json({ message: 'Error adding product entry', error });
    }
};

exports.getProductByFarmerStockId = async (req, res) => {
    try {
        const { farmerStockDetailsId } = req.params;

        // Fetch all product entries related to the given farmerStockDetailsId
        const farmerSegregate = await FarmerProductEntry.find({ farmerStockDetailsId })
            .populate('farmerStockDetailsId');

        if (!farmerSegregate || farmerSegregate.length === 0) {
            return res.status(404).json({ error: 'No product entries found for this farmerStockDetails ID' });
        }

        // Map the data to extract only required fields and calculate totalCost dynamically
        const formattedData = farmerSegregate.map(stock => ({
            _id: stock._id,
            farmerStockDetailsId: stock.farmerStockDetailsId ? stock.farmerStockDetailsId._id : null,
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
        const { farmerStockDetailsId } = req.params;

        // Find all product entries linked to the given farmerStockDetails ID
        const productEntries = await FarmerProductEntry.find({ farmerStockDetailsId });

        if (!productEntries.length) {
            return res.status(404).json({ message: 'No product entries found for this farmerStockDetails ID' });
        }

        // Calculate totals
        const totalMaterialCost = parseFloat(productEntries.reduce((sum, entry) => sum + entry.totalCost, 0).toFixed(2));
        const totalMaterialWeight = parseFloat(productEntries.reduce((sum, entry) => sum + entry.quantity, 0).toFixed(2));
        // Update farmerStockDetails
        await FarmerStockDetails.findByIdAndUpdate(farmerStockDetailsId, {
            totalMaterialCost,
            totalMaterialWeight
        });

        res.status(200).json({ message: 'Totals calculated and updated', totalMaterialCost, totalMaterialWeight });
    } catch (error) {
        res.status(500).json({ message: 'Error calculating totals', error });
    }
};

exports.updateFarmerProductEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { productInfo, quantity } = req.body;

        // Find the product entry
        const productEntry = await FarmerProductEntry.findById(id);
        if (!productEntry) {
            return res.status(404).json({ message: 'Product entry not found' });
        }

        // Fetch the farmerStockDetails document
        const farmerStockDetails = await FarmerStockDetails.findById(productEntry.farmerStockDetailsId);
        if (!farmerStockDetails) {
            return res.status(404).json({ message: 'farmerStockDetails not found' });
        }

        // Update the appropriate weight field in farmerStockDetails based on productInfo
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

        // Update the farmerStockDetails document
        await FarmerStockDetails.findByIdAndUpdate(productEntry.farmerStockDetailsId, updateFields);

        res.status(200).json({ message: 'Product entry updated successfully', productEntry });
    } catch (error) {
        res.status(500).json({ message: 'Error updating product entry', error });
    }
};

// Delete a product entry
exports.deleteFarmerProductEntry = async (req, res) => {
    try {
        const { id } = req.params;

        // Find and delete the product entry
        const productEntry = await FarmerProductEntry.findByIdAndDelete(id);
        if (!productEntry) {
            return res.status(404).json({ message: 'Product entry not found' });
        }

        res.status(200).json({ message: 'Product entry deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting product entry', error });
    }
};
