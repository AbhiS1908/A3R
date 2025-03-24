const VendorStock = require('../models/vendorStockModel'); // Import vendorStock model
const VendorMakhana = require('../models/vendorMakhanaModel'); // Import VendorMakhana model

// POST: Calculate and save VendorMakhana data
exports.calculateMakhana = async (req, res) => {
    try {
        const { vendorStockId, makhana, quantity, bagCount, mixingDetails } = req.body;

        // Debug: Log the bagCount value
        console.log("bagCount from request:", bagCount);

        // Fetch the vendorStock document
        const vendorStock = await VendorStock.findById(vendorStockId);
        if (!vendorStock) {
            return res.status(404).json({ message: 'vendorStock not found' });
        }

        let ratePerKg, totalCost;

        if (makhana !== 'Mixing') {
            // Determine ratePerKg based on makhana value
            const index = { '6 Sutta': 0, '5 Sutta': 1, '4 Sutta': 2, '3 Sutta': 3, 'Others': 4, 'Waste': 5 }[makhana];
            ratePerKg = vendorStock.finalPrices[index];
            totalCost = quantity * ratePerKg;

            // Save the data
            const makhanaData = new VendorMakhana({
                vendorStockId,
                makhana,
                quantity: parseFloat(quantity), // Ensure quantity is a number
                bagCount: parseFloat(bagCount), // Ensure bagCount is a number
                ratePerKg,
                totalCost,
            });
            await makhanaData.save();

            return res.status(200).json({ message: 'Calculation successful', data: makhanaData });
        } else {
            // Handle the "Mixing" case
            if (!mixingDetails || mixingDetails.length === 0) {
                return res.status(400).json({ message: 'Mixing details are required' });
            }

            // Initialize weight fields
            const weights = {
                '6 Sutta': 0,
                '5 Sutta': 0,
                '4 Sutta': 0,
                '3 Sutta': 0,
                'Others': 0,
                'Waste': 0,
            };

            // Calculate totalCost and total quantity for mixing
            let totalCostMixing = 0;
            let totalQuantityMixing = 0;

            mixingDetails.forEach((detail) => {
                const rateIndex = { '6 Sutta': 0, '5 Sutta': 1, '4 Sutta': 2, '3 Sutta': 3, 'Others': 4, 'Waste': 5 }[detail.productInfo];
                detail.ratePerKgSmall = vendorStock.finalPrices[rateIndex];
                detail.quantitySmall = parseFloat(detail.quantitySmall) || 0; // Ensure quantitySmall is a number
                totalCostMixing += detail.ratePerKgSmall * detail.quantitySmall;
                totalQuantityMixing += detail.quantitySmall;

                // Populate weight fields based on productInfo
                weights[detail.productInfo] += detail.quantitySmall;
            });

            // Debug: Log the weights and bagCount
            console.log("Weights:", weights);
            console.log("bagCount:", bagCount);

            // Ensure bagCount is a valid number
            const bagCountValue = parseFloat(bagCount) || 1; // Default to 1 if bagCount is invalid

            // Debug: Log the bagCountValue
            console.log("bagCountValue:", bagCountValue);

            // Calculate finalWeight fields using bagCountValue
            const finalWeights = {
                finalWeight1: weights['6 Sutta'] * bagCountValue,
                finalWeight2: weights['5 Sutta'] * bagCountValue,
                finalWeight3: weights['4 Sutta'] * bagCountValue,
                finalWeight4: weights['3 Sutta'] * bagCountValue,
                finalWeight5: weights['Others'] * bagCountValue,
                finalWeight6: weights['Waste'] * bagCountValue,
            };

            // Debug: Log the finalWeights
            console.log("finalWeights:", finalWeights);

            // Save the data
            const makhanaData = new VendorMakhana({
                vendorStockId,
                makhana,
                quantity: totalQuantityMixing, // Set quantity as the sum of quantitySmall
                bagCount: bagCountValue, // Ensure bagCount is a number
                totalCost: totalCostMixing,
                mixingDetails,
                weight1: weights['6 Sutta'],
                weight2: weights['5 Sutta'],
                weight3: weights['4 Sutta'],
                weight4: weights['3 Sutta'],
                weight5: weights['Others'],
                weight6: weights['Waste'],
                ...finalWeights, // Spread the finalWeights object into the document
            });
            await makhanaData.save();

            return res.status(200).json({ message: 'Mixing calculation successful', data: makhanaData });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// GET: Fetch all VendorMakhana records
exports.getAllMakhana = async (req, res) => {
    try {
        const makhanaRecords = await VendorMakhana.find();
        res.status(200).json({ message: 'Records fetched successfully', data: makhanaRecords });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// GET: Fetch VendorMakhana records by vendorStockId
exports.getMakhanaByVendorStockId = async (req, res) => {
    try {
        const { vendorStockId } = req.params;
        const makhanaRecords = await VendorMakhana.find({ vendorStockId });
        if (!makhanaRecords.length) {
            return res.status(404).json({ message: 'No records found for this vendorStockId' });
        }
        res.status(200).json({ message: 'Records fetched successfully', data: makhanaRecords });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// PUT: Update a VendorMakhana record by ID
exports.updateMakhana = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendorStockId, makhana, quantity, bagCount, mixingDetails } = req.body;

        // Fetch the existing Makhana record
        const existingMakhana = await VendorMakhana.findById(id);
        if (!existingMakhana) {
            return res.status(404).json({ message: 'Makhana record not found' });
        }

        // Fetch the vendorStock document
        const vendorStock = await VendorStock.findById(vendorStockId);
        if (!vendorStock) {
            return res.status(404).json({ message: 'vendorStock not found' });
        }

        let ratePerKg, totalCost;

        if (makhana !== 'Mixing') {
            // Determine ratePerKg based on makhana value
            const index = { '6 Sutta': 0, '5 Sutta': 1, '4 Sutta': 2, '3 Sutta': 3, 'Others': 4, 'Waste': 5 }[makhana];
            ratePerKg = vendorStock.finalPrices[index];
            totalCost = quantity * ratePerKg;

            // Update the Makhana record
            existingMakhana.makhana = makhana;
            existingMakhana.quantity = parseFloat(quantity); // Ensure quantity is a number
            existingMakhana.bagCount = parseFloat(bagCount); // Ensure bagCount is a number
            existingMakhana.ratePerKg = ratePerKg;
            existingMakhana.totalCost = totalCost;

            // Save the updated record
            await existingMakhana.save();

            return res.status(200).json({ message: 'Update successful', data: existingMakhana });
        } else {
            // Handle the "Mixing" case
            if (!mixingDetails || mixingDetails.length === 0) {
                return res.status(400).json({ message: 'Mixing details are required' });
            }

            // Initialize weight fields
            const weights = {
                '6 Sutta': 0,
                '5 Sutta': 0,
                '4 Sutta': 0,
                '3 Sutta': 0,
                'Others': 0,
                'Waste': 0,
            };

            // Calculate totalCost and total quantity for mixing
            let totalCostMixing = 0;
            let totalQuantityMixing = 0;

            mixingDetails.forEach((detail) => {
                const rateIndex = { '6 Sutta': 0, '5 Sutta': 1, '4 Sutta': 2, '3 Sutta': 3, 'Others': 4, 'Waste': 5 }[detail.productInfo];
                detail.ratePerKgSmall = vendorStock.finalPrices[rateIndex];
                detail.quantitySmall = parseFloat(detail.quantitySmall) || 0; // Ensure quantitySmall is a number
                totalCostMixing += detail.ratePerKgSmall * detail.quantitySmall;
                totalQuantityMixing += detail.quantitySmall;

                // Populate weight fields based on productInfo
                weights[detail.productInfo] += detail.quantitySmall;
            });

            // Ensure bagCount is a valid number
            const bagCountValue = parseFloat(bagCount) || 1; // Default to 1 if bagCount is invalid

            // Calculate finalWeight fields using bagCountValue
            const finalWeights = {
                finalWeight1: weights['6 Sutta'] * bagCountValue,
                finalWeight2: weights['5 Sutta'] * bagCountValue,
                finalWeight3: weights['4 Sutta'] * bagCountValue,
                finalWeight4: weights['3 Sutta'] * bagCountValue,
                finalWeight5: weights['Others'] * bagCountValue,
                finalWeight6: weights['Waste'] * bagCountValue,
            };

            // Update the Makhana record
            existingMakhana.makhana = makhana;
            existingMakhana.quantity = totalQuantityMixing; // Set quantity as the sum of quantitySmall
            existingMakhana.bagCount = bagCountValue; // Ensure bagCount is a number
            existingMakhana.totalCost = totalCostMixing;
            existingMakhana.mixingDetails = mixingDetails;
            existingMakhana.weight1 = weights['6 Sutta'];
            existingMakhana.weight2 = weights['5 Sutta'];
            existingMakhana.weight3 = weights['4 Sutta'];
            existingMakhana.weight4 = weights['3 Sutta'];
            existingMakhana.weight5 = weights['Others'];
            existingMakhana.weight6 = weights['Waste'];
            existingMakhana.finalWeight1 = finalWeights.finalWeight1;
            existingMakhana.finalWeight2 = finalWeights.finalWeight2;
            existingMakhana.finalWeight3 = finalWeights.finalWeight3;
            existingMakhana.finalWeight4 = finalWeights.finalWeight4;
            existingMakhana.finalWeight5 = finalWeights.finalWeight5;
            existingMakhana.finalWeight6 = finalWeights.finalWeight6;

            // Save the updated record
            await existingMakhana.save();

            return res.status(200).json({ message: 'Mixing update successful', data: existingMakhana });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// DELETE: Delete a VendorMakhana record by ID
exports.deleteMakhana = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedMakhana = await VendorMakhana.findByIdAndDelete(id);
        if (!deletedMakhana) {
            return res.status(404).json({ message: 'VendorMakhana record not found' });
        }
        res.status(200).json({ message: 'Record deleted successfully', data: deletedMakhana });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
// PUT: Bag Out - Subtract quantity * packetCount from finalTotalWeight of linked vendorStock
exports.bagOut = async (req, res) => {
    try {
        const { makhanaId, packetCount } = req.body;

        // Fetch the VendorMakhana record
        const makhanaRecord = await VendorMakhana.findById(makhanaId);
        if (!makhanaRecord) {
            return res.status(404).json({ message: 'VendorMakhana record not found' });
        }

        // Fetch the linked vendorStock
        const vendorStock = await VendorStock.findById(makhanaRecord.vendorStockId);
        if (!vendorStock) {
            return res.status(404).json({ message: 'Linked vendorStock not found' });
        }

        // Calculate the total weight to subtract
        const weightToSubtract = makhanaRecord.quantity * packetCount;

        // Update the finalTotalWeight of vendorStock
        vendorStock.finalTotalWeight -= weightToSubtract;

        // Subtract finalWeight1 to finalWeight6 from totalWeight1 to totalWeight6
        vendorStock.totalWeight1 -= makhanaRecord.finalWeight1 || 0;
        vendorStock.totalWeight2 -= makhanaRecord.finalWeight2 || 0;
        vendorStock.totalWeight3 -= makhanaRecord.finalWeight3 || 0;
        vendorStock.totalWeight4 -= makhanaRecord.finalWeight4 || 0;
        vendorStock.totalWeight5 -= makhanaRecord.finalWeight5 || 0;
        vendorStock.totalWeight6 -= makhanaRecord.finalWeight6 || 0;

        // Save the updated vendorStock
        await vendorStock.save();

        // Respond with success message and updated vendorStock
        res.status(200).json({
            message: 'Bag Out successful',
            data: {
                vendorStock,
                weightSubtracted: weightToSubtract,
                finalWeightsSubtracted: {
                    finalWeight1: makhanaRecord.finalWeight1,
                    finalWeight2: makhanaRecord.finalWeight2,
                    finalWeight3: makhanaRecord.finalWeight3,
                    finalWeight4: makhanaRecord.finalWeight4,
                    finalWeight5: makhanaRecord.finalWeight5,
                    finalWeight6: makhanaRecord.finalWeight6,
                },
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// PUT: Bag Out - Subtract quantity * bagCount from finalTotalWeight and the corresponding totalWeight field
exports.bagOutByMakhanaType = async (req, res) => {
    try {
        const { makhanaId } = req.body;

        // Fetch the VendorMakhana record
        const makhanaRecord = await VendorMakhana.findById(makhanaId);
        if (!makhanaRecord) {
            return res.status(404).json({ message: 'VendorMakhana record not found' });
        }

        // Fetch the linked vendorStock
        const vendorStock = await VendorStock.findById(makhanaRecord.vendorStockId);
        if (!vendorStock) {
            return res.status(404).json({ message: 'Linked vendorStock not found' });
        }

        // Calculate the total weight to subtract
        const weightToSubtract = makhanaRecord.quantity * makhanaRecord.bagCount;

        // Update the finalTotalWeight of vendorStock
        vendorStock.finalTotalWeight -= weightToSubtract;

        // Determine which totalWeight field to update based on makhana type
        switch (makhanaRecord.makhana) {
            case '6 Sutta':
                vendorStock.totalWeight1 -= weightToSubtract;
                break;
            case '5 Sutta':
                vendorStock.totalWeight2 -= weightToSubtract;
                break;
            case '4 Sutta':
                vendorStock.totalWeight3 -= weightToSubtract;
                break;
            case '3 Sutta':
                vendorStock.totalWeight4 -= weightToSubtract;
                break;
            case 'Others':
                vendorStock.totalWeight5 -= weightToSubtract;
                break;
            case 'Waste':
                vendorStock.totalWeight6 -= weightToSubtract;
                break;
            default:
                return res.status(400).json({ message: 'Invalid makhana type' });
        }

        // Save the updated vendorStock
        await vendorStock.save();

        // Respond with success message and updated vendorStock
        res.status(200).json({
            message: 'Bag Out successful',
            data: {
                vendorStock,
                weightSubtracted: weightToSubtract,
                makhanaType: makhanaRecord.makhana,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};