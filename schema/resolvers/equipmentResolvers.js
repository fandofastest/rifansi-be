const { Equipment, Area, Contract, FuelPrice, User } = require('../../models');

const Query = {
    equipments: async (_, { status }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        
        // Build query object
        const query = {};
        if (status) {
            query.serviceStatus = status.toUpperCase();
        }
        
        const equipments = await Equipment.find(query).populate('area');
        // Transform serviceStatus ke uppercase dan pastikan id ada
        return equipments.map(equipment => {
            const equipmentObj = equipment.toObject();
            return {
                ...equipmentObj,
                id: equipmentObj._id,
                serviceStatus: equipmentObj.serviceStatus?.toUpperCase()
            };
        });
    },
    equipment: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const equipment = await Equipment.findById(id).populate('area');
        if (!equipment) return null;
        const equipmentObj = equipment.toObject();
        return {
            ...equipmentObj,
            id: equipmentObj._id,
            serviceStatus: equipmentObj.serviceStatus?.toUpperCase()
        };
    },
    equipmentsByStatus: async (_, { status }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const equipments = await Equipment.find({ serviceStatus: status.toUpperCase() }).populate('area');
        return equipments.map(equipment => {
            const equipmentObj = equipment.toObject();
            return {
                ...equipmentObj,
                id: equipmentObj._id,
                serviceStatus: equipmentObj.serviceStatus?.toUpperCase()
            };
        });
    },
    equipmentsByArea: async (_, { areaId }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        const equipments = await Equipment.find({ area: areaId }).populate('area');
        return equipments.map(equipment => {
            const equipmentObj = equipment.toObject();
            return {
                ...equipmentObj,
                id: equipmentObj._id,
                serviceStatus: equipmentObj.serviceStatus?.toUpperCase()
            };
        });
    },
    getEquipmentAreaHistory: async (_, { equipmentId }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const equipment = await Equipment.findById(equipmentId)
            .populate({
                path: 'areaHistory.areaId',
                model: 'Area'
            })
            .populate({
                path: 'areaHistory.updatedBy',
                model: 'User',
                select: 'id username fullName'
            });

        if (!equipment) {
            throw new Error('Equipment tidak ditemukan');
        }

        // Transform data untuk memastikan format yang benar
        return equipment.areaHistory.map(history => ({
            areaId: history.areaId._id,
            area: history.areaId,
            remarks: history.remarks,
            updatedBy: history.updatedBy,
            updatedAt: history.updatedAt
        }));
    },
    getEquipmentServiceHistory: async (_, { equipmentId }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const equipment = await Equipment.findById(equipmentId)
            .populate({
                path: 'serviceHistory.updatedBy',
                model: 'User'
            });

        if (!equipment) {
            throw new Error('Equipment tidak ditemukan');
        }

        return equipment.serviceHistory;
    }
};

const Mutation = {
    createEquipment: async (_, args, { user }) => {
        if (!user) throw new Error('Not authenticated');

        if (args.area) {
            const areaExists = await Area.findById(args.area);
            if (!areaExists) throw new Error('Area not found');
        }

        // Transform serviceStatus ke uppercase
        if (args.serviceStatus) {
            args.serviceStatus = args.serviceStatus.toUpperCase();
        }

        const equipment = new Equipment(args);
        const savedEquipment = await equipment.save();
        const populatedEquipment = await savedEquipment.populate('area');
        const equipmentObj = populatedEquipment.toObject();

        return {
            ...equipmentObj,
            id: equipmentObj._id,
            serviceStatus: equipmentObj.serviceStatus?.toUpperCase()
        };
    },

    updateEquipment: async (_, { id, equipmentCode, plateOrSerialNo, equipmentType, defaultOperator, area, fuelType, year, serviceStatus, description }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const updateData = {};
        if (equipmentCode !== undefined) updateData.equipmentCode = equipmentCode;
        if (plateOrSerialNo !== undefined) updateData.plateOrSerialNo = plateOrSerialNo;
        if (equipmentType !== undefined) updateData.equipmentType = equipmentType;
        if (defaultOperator !== undefined) updateData.defaultOperator = defaultOperator;
        if (area !== undefined) {
            const areaExists = await Area.findById(area);
            if (!areaExists) throw new Error('Area not found');
            updateData.area = area;
        }
        if (fuelType !== undefined) updateData.fuelType = fuelType;
        if (year !== undefined) updateData.year = year;
        if (serviceStatus !== undefined) updateData.serviceStatus = serviceStatus.toUpperCase();
        if (description !== undefined) updateData.description = description;

        const equipment = await Equipment.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate('area');

        if (!equipment) throw new Error('Equipment not found');

        const equipmentObj = equipment.toObject();
        return {
            ...equipmentObj,
            id: equipmentObj._id,
            serviceStatus: equipmentObj.serviceStatus?.toUpperCase()
        };
    },

    deleteEquipment: async (_, { id }, { user }) => {
        if (!user) throw new Error('Not authenticated');
        await Equipment.findByIdAndDelete(id);
        return true;
    },

    addContractToEquipment: async (_, { equipmentId, contract }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const equipment = await Equipment.findById(equipmentId);
        if (!equipment) throw new Error('Equipment not found');

        const contractExists = await Contract.findById(contract.contractId);
        if (!contractExists) throw new Error('Contract not found');

        const contractAlreadyAttached = equipment.contracts && equipment.contracts.some(
            c => c.contractId.toString() === contract.contractId
        );

        if (contractAlreadyAttached) {
            throw new Error('Contract already attached to this equipment');
        }

        if (!equipment.contracts) {
            equipment.contracts = [];
        }

        equipment.contracts.push({
            contractId: contract.contractId,
            equipmentId: contract.equipmentId,
            rentalRate: contract.rentalRate
        });

        await equipment.save();
        return equipment;
    },

    updateEquipmentContract: async (_, { equipmentId, contractId, rentalRate }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const equipment = await Equipment.findById(equipmentId);
        if (!equipment) throw new Error('Equipment not found');

        if (!equipment.contracts || !equipment.contracts.length) {
            throw new Error('This equipment has no contracts');
        }

        const contractIndex = equipment.contracts.findIndex(
            c => c.contractId.toString() === contractId
        );

        if (contractIndex === -1) {
            throw new Error('Contract not found in this equipment');
        }

        equipment.contracts[contractIndex].rentalRate = rentalRate;
        await equipment.save();

        return equipment;
    },

    removeContractFromEquipment: async (_, { equipmentId, contractId }, { user }) => {
        if (!user) throw new Error('Not authenticated');

        const equipment = await Equipment.findById(equipmentId);
        if (!equipment) throw new Error('Equipment not found');

        if (!equipment.contracts || !equipment.contracts.length) {
            throw new Error('This equipment has no contracts');
        }

        equipment.contracts = equipment.contracts.filter(
            c => c.contractId.toString() !== contractId
        );

        await equipment.save();

        return equipment;
    },

    updateEquipmentServiceStatus: async (_, { equipmentId, serviceStatus, remarks }, { user }) => {
        try {
            if (!user) throw new Error('Not authenticated');

            // Validasi bahwa user adalah admin atau superadmin
            const currentUser = await User.findById(user.userId).populate('role');
            if (!currentUser) {
                throw new Error('User tidak ditemukan');
            }

            const isAdmin = currentUser.role && (currentUser.role.roleCode === 'ADMIN' || currentUser.role.roleCode === 'SUPERADMIN');
            if (!isAdmin) {
                throw new Error('Hanya admin dan superadmin yang dapat mengubah status servis equipment');
            }

            // Cek apakah equipment ada
            const equipment = await Equipment.findById(equipmentId);
            if (!equipment) {
                throw new Error('Equipment tidak ditemukan');
            }

            // Update status servis
            equipment.serviceStatus = serviceStatus;
            equipment.lastUpdatedBy = user.userId;
            equipment.lastUpdatedAt = new Date();

            // Tambahkan ke riwayat perubahan status
            if (!equipment.serviceHistory) {
                equipment.serviceHistory = [];
            }

            equipment.serviceHistory.push({
                status: serviceStatus,
                remarks: remarks || '',
                updatedBy: user.userId,
                updatedAt: new Date()
            });

            await equipment.save();

            // Populate relasi yang diperlukan
            const populatedEquipment = await Equipment.findById(equipment._id)
                .populate('area')
                .populate('lastUpdatedBy')
                .populate({
                    path: 'serviceHistory.updatedBy',
                    model: 'User',
                    select: 'id username fullName'
                });

            // Transform data untuk memastikan format yang benar
            const equipmentObj = populatedEquipment.toObject();
            return {
                ...equipmentObj,
                id: equipmentObj._id,
                serviceStatus: equipmentObj.serviceStatus?.toUpperCase(),
                serviceHistory: equipmentObj.serviceHistory.map(history => ({
                    ...history,
                    status: history.status?.toUpperCase()
                }))
            };
        } catch (error) {
            console.error('Error in updateEquipmentServiceStatus:', error);
            throw new Error(error.message || 'Terjadi kesalahan saat mengubah status servis equipment');
        }
    },

    updateEquipmentArea: async (_, { equipmentId, areaId, remarks }, { user }) => {
        try {
            if (!user) throw new Error('Not authenticated');

            // Validasi bahwa user adalah admin atau superadmin
            const currentUser = await User.findById(user.userId).populate('role');
            if (!currentUser) {
                throw new Error('User tidak ditemukan');
            }

            const isAdmin = currentUser.role && (currentUser.role.roleCode === 'ADMIN' || currentUser.role.roleCode === 'SUPERADMIN');
            if (!isAdmin) {
                throw new Error('Hanya admin dan superadmin yang dapat mengubah area equipment');
            }

            // Cek apakah equipment ada
            const equipment = await Equipment.findById(equipmentId);
            if (!equipment) {
                throw new Error('Equipment tidak ditemukan');
            }

            // Cek apakah area ada
            const area = await Area.findById(areaId);
            if (!area) {
                throw new Error('Area tidak ditemukan');
            }

            // Update area
            equipment.area = areaId;
            equipment.lastUpdatedBy = user.userId;
            equipment.lastUpdatedAt = new Date();

            // Tambahkan ke riwayat perubahan area
            if (!equipment.areaHistory) {
                equipment.areaHistory = [];
            }

            equipment.areaHistory.push({
                areaId: areaId,
                remarks: remarks || '',
                updatedBy: user.userId,
                updatedAt: new Date()
            });

            await equipment.save();

            // Populate relasi yang diperlukan
            const populatedEquipment = await Equipment.findById(equipment._id)
                .populate('area')
                .populate('lastUpdatedBy')
                .populate({
                    path: 'areaHistory.updatedBy',
                    model: 'User'
                });

            return populatedEquipment;
        } catch (error) {
            console.error('Error in updateEquipmentArea:', error);
            throw new Error(error.message || 'Terjadi kesalahan saat mengubah area equipment');
        }
    }
};

const EquipmentResolvers = {
    area: async (parent) => {
        if (!parent.area) return null;
        const area = await Area.findById(parent.area);
        if (!area) {
            console.warn(`Area not found for equipment ${parent.id || parent._id}`);
            return null;
        }
        return area;
    },
    currentFuelPrice: async (parent) => {
        return FuelPrice.findOne({
            effectiveDate: { $lte: new Date() }
        }).sort({ effectiveDate: -1 });
    },
    serviceStatus: (parent) => {
        return parent.serviceStatus?.toUpperCase();
    }
};

const EquipmentContractResolvers = {
    contract: async (parent) => {
        return Contract.findById(parent.contractId);
    },
    rentalRatePerDay: (parent) => {
        // Ambil rentalRate dari contract ini
        const rentalRate = parent.rentalRate || 0;
        
        // Hitung jumlah hari dalam bulan sekarang
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth(); // 0-based (0 = January)
        
        // Buat tanggal untuk hari terakhir bulan ini
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const daysInCurrentMonth = lastDayOfMonth.getDate();
        
        // Hitung rental rate per hari
        const rentalRatePerDay = rentalRate / daysInCurrentMonth;
        
        return Math.round(rentalRatePerDay * 100) / 100; // Round to 2 decimal places
    }
};

const EquipmentAreaHistoryResolvers = {
    area: async (parent) => {
        if (!parent.areaId) return null;
        return Area.findById(parent.areaId);
    },
    updatedBy: async (parent) => {
        if (!parent.updatedBy) return null;
        return User.findById(parent.updatedBy);
    }
};

const EquipmentServiceHistoryResolvers = {
    updatedBy: async (parent) => {
        if (!parent.updatedBy) return null;
        return User.findById(parent.updatedBy);
    }
};

module.exports = {
    Query,
    Mutation,
    Equipment: EquipmentResolvers,
    EquipmentContract: EquipmentContractResolvers,
    EquipmentAreaHistory: EquipmentAreaHistoryResolvers,
    EquipmentServiceHistory: EquipmentServiceHistoryResolvers
}; 