/**
 * Safe Database Query Utilities
 * Prevents common database errors and ensures proper fallbacks
 */

/**
 * Safe findOne with fallback
 */
export const safeFindOne = async (Model, query, options = {}) => {
  try {
    const result = await Model.findOne(query).lean();
    return result || null;
  } catch (error) {
    console.error(`Error finding one in ${Model.collection.name}:`, error.message);
    throw error;
  }
};

/**
 * Safe find with fallback to empty array
 */
export const safeFind = async (Model, query = {}, options = {}) => {
  try {
    const result = await Model.find(query).lean();
    return result || [];
  } catch (error) {
    console.error(`Error finding in ${Model.collection.name}:`, error.message);
    return [];
  }
};

/**
 * Safe findById
 */
export const safeFindById = async (Model, id) => {
  try {
    const result = await Model.findById(id).lean();
    return result || null;
  } catch (error) {
    console.error(`Error finding by ID in ${Model.collection.name}:`, error.message);
    return null;
  }
};

/**
 * Safe count with fallback
 */
export const safeCount = async (Model, query = {}) => {
  try {
    const count = await Model.countDocuments(query);
    return count || 0;
  } catch (error) {
    console.error(`Error counting in ${Model.collection.name}:`, error.message);
    return 0;
  }
};

/**
 * Safe save with validation
 */
export const safeSave = async (document) => {
  try {
    if (!document) {
      throw new Error('Document is null or undefined');
    }
    const result = await document.save();
    return result;
  } catch (error) {
    console.error('Error saving document:', error.message);
    throw error;
  }
};

/**
 * Safe update with validation
 */
export const safeUpdate = async (Model, query, update, options = {}) => {
  try {
    const result = await Model.findOneAndUpdate(
      query,
      update,
      { new: true, runValidators: true, ...options }
    ).lean();
    return result || null;
  } catch (error) {
    console.error(`Error updating in ${Model.collection.name}:`, error.message);
    throw error;
  }
};

/**
 * Safe delete with validation
 */
export const safeDelete = async (Model, query) => {
  try {
    const result = await Model.findOneAndDelete(query).lean();
    return result || null;
  } catch (error) {
    console.error(`Error deleting from ${Model.collection.name}:`, error.message);
    throw error;
  }
};

/**
 * Bulk operations with error handling
 */
export const safeBulkWrite = async (Model, operations) => {
  try {
    const result = await Model.bulkWrite(operations);
    return result;
  } catch (error) {
    console.error('Bulk write error:', error.message);
    throw error;
  }
};

/**
 * Aggregate with error handling
 */
export const safeAggregate = async (Model, pipeline) => {
  try {
    const result = await Model.aggregate(pipeline);
    return result || [];
  } catch (error) {
    console.error('Aggregation error:', error.message);
    return [];
  }
};

/**
 * Validates connection is active
 */
export const checkDatabaseConnection = async (mongoose) => {
  const connectionState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (connectionState !== 1) {
    throw new Error(`Database not connected. State: ${connectionState}`);
  }
  return true;
};
