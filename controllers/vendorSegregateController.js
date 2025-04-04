const VendorStock = require('../models/vendorStockModel');
const VendorSegregate = require('../models/vendorSegregateModel');

// Create a vendor Form linked to vendor ID
exports.createVendorSegregate = async (req, res) => {
    try {
        const { vendorStockId, percentage, makhana, totalWeight, ratePerKg, finalPrice, transportationCharge, totalPriceStandard, totalPriceFinal } = req.body;

        const vendorStock = await VendorStock.findById(vendorStockId);
        if (!vendorStock) {
            return res.status(404).json({ error: 'vendor Stock not found' });
        }

        const vendorSegregate = new VendorSegregate({
            vendorStockId,
            percentage,
            makhana,
            totalWeight,
            ratePerKg,
            finalPrice,
            transportationCharge,
            totalPriceStandard,
            totalPriceFinal
        });

        await vendorSegregate.save();

        vendorStock.finalPrices.push(finalPrice);
        if (!vendorStock.totalWeight1) {
            vendorStock.totalWeight1 = totalWeight;
        } else if (!vendorStock.totalWeight2) {
            vendorStock.totalWeight2 = totalWeight;
        } else if (!vendorStock.totalWeight3) {
            vendorStock.totalWeight3 = totalWeight;
        } else if (!vendorStock.totalWeight4) {
            vendorStock.totalWeight4 = totalWeight;
        } else if (!vendorStock.totalWeight5) {
            vendorStock.totalWeight5 = totalWeight;
        } else if (!vendorStock.totalWeight6) {
            vendorStock.totalWeight6 = totalWeight;
        } else {
            return res.status(400).json({ error: 'All 6 totalWeight fields are already filled' });
        }
        await vendorStock.save();

        // Update totals in vendorStock
        const aggregation = await VendorSegregate.aggregate([
            { $match: { vendorStockId: vendorStock._id } },
            {
                $group: {
                    _id: "$vendorStockId",
                    finalTotalWeight: { $sum: "$totalWeight" },
                    totalFinalPrice: { $sum: "$finalPrice" },
                    finalTotalPriceStandard: { $sum: "$totalPriceStandard" },
                    finalTotalPriceFinal: { $sum: "$totalPriceFinal" }
                }
            }
        ]);

        if (aggregation.length > 0) {
            await VendorStock.findByIdAndUpdate(vendorStockId, {
                finalTotalWeight: aggregation[0].finalTotalWeight,
                totalFinalPrice: aggregation[0].totalFinalPrice,
                finalTotalPriceStandard: aggregation[0].finalTotalPriceStandard,
                finalTotalPriceFinal: aggregation[0].finalTotalPriceFinal
            });
        }

        res.status(201).json({ message: 'vendor Segregation created successfully', vendorSegregate });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating vendor Segregation' });
    }
};

// Get all Cash Entries
exports.getAllVendorSegregate = async (req, res) => {
    try {
        const vendorEntries = await VendorSegregate.find();
        res.status(200).json(vendorEntries);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching Cash entries' });
    }
};

// Get Cash Form by Cash ID
// exports.getVendorSegregateByVendorId = async (req, res) => {
//     try {
//         const { vendorStockId } = req.params;
//         const vendorSegregate = await VendorSegregate.findOne({ vendorStockId }).populate('cashId');
//         if (!vendorSegregate) {
//             return res.status(404).json({ error: 'Cash Form not found' });
//         }
//         res.status(200).json(vendorSegregate);
//     } catch (error) {
//         res.status(500).json({ error: 'Error fetching Cash Form' });
//     }
// };

exports.getVendorSegregateByVendorId = async (req, res) => {
    try {
        const { vendorStockId } = req.params;

        // Fetch all cashStock records related to the given cashFormId
        const vendorSegregate = await VendorSegregate.find({ vendorStockId }).populate('vendorStockId');

        if (!vendorSegregate || vendorSegregate.length === 0) {
            return res.status(404).json({ error: 'No Cash Stock entries found for this Cash Form ID' });
        }

        // Map the data to extract only required fields
        const formattedData = vendorSegregate.map(stock => ({
            _id: stock._id,
            vendorStockId: stock.vendorStockId._id,
            percentage: stock.percentage,
            makhana: stock.makhana, 
            totalWeight: stock.totalWeight,
            ratePerKg: stock.ratePerKg,
            finalPrice: stock.finalPrice,
            transportationCharge: stock.transportationCharge,
            totalPriceStandard: stock.totalPriceStandard,
            totalPriceFinal: stock.totalPriceFinal
        }));

        res.status(200).json(formattedData);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching Cash Stock entries', details: error.message });
    }
};

// Update a Cash Form
exports.updateVendorSegregate = async (req, res) => {
    try {
        const { id } = req.params; // Use the document's unique _id

        const updatedVendorSegregate = await VendorSegregate.findByIdAndUpdate(id, req.body, { new: true });

        if (!updatedVendorSegregate) {
            return res.status(404).json({ error: 'Cash Form not found' });
        }

        res.status(200).json({ message: 'Cash Form updated successfully', updatedVendorSegregate });
    } catch (error) {
        res.status(500).json({ error: 'Error updating Cash Form' });
    }
};


// Delete a Cash Entry and associated Cash Form
exports.deleteVendorSegregate = async (req, res) => {
    try {
        const { id } = req.params; // Use the document's unique _id

        const deletedVendorSegregate = await VendorSegregate.findByIdAndDelete(id);
        if (!deletedVendorSegregate) {
            return res.status(404).json({ error: 'Cash Form not found' });
        }

        res.status(200).json({ message: 'Cash Form deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting Cash Form' });
    }
};

