import { Model } from "mongoose";

export const buildMongoQuery = (filters: any): any => {
  if (!filters) return {};

  const query: any = {};

  for (const field in filters) {
    const filter = filters[field];
    const filterType = filter.type || filter.filterType;

    switch (filterType) {
      case "text":
      case "contains":
        query[field] = { $regex: filter.filter, $options: "i" };
        break;
      case "equals":
        query[field] = filter.filter;
        break;
      case "notEqual":
        query[field] = { $ne: filter.filter };
        break;
      case "startsWith":
        query[field] = { $regex: `^${filter.filter}`, $options: "i" };
        break;
      case "endsWith":
        query[field] = { $regex: `${filter.filter}$`, $options: "i" };
        break;
      case "lessThan":
        query[field] = { $lt: filter.filter };
        break;
      case "greaterThan":
        query[field] = { $gt: filter.filter };
        break;
      case "inRange":
        query[field] = {
          $gte: filter.filter,
          $lte: filter.filterTo,
        };
        break;
      default:
        if (filter.filter !== undefined) {
          query[field] = filter.filter;
        }
    }
  }

  return query;
};

export const buildMongoSort = (sortModel: any[]): any => {
  if (!sortModel || sortModel.length === 0) return {};

  const sort: any = {};

  for (const sortItem of sortModel) {
    sort[sortItem.colId] = sortItem.sort === "asc" ? 1 : -1;
  }

  return sort;
};

export const getSearchQuery = (searchTerm: string, fields: string[]): any => {
  if (!searchTerm || fields.length === 0) return {};

  const orConditions = fields.map((field) => ({
    [field]: { $regex: searchTerm, $options: "i" },
  }));

  return { $or: orConditions };
};

export const paginateQuery = async (
  model: Model<any>,
  query: any,
  page: number,
  pageSize: number,
  sort: any,
  search?: string,
  searchFields?: string[]
): Promise<{
  data: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  try {
    let finalQuery = { ...query };

    if (search && searchFields && searchFields.length > 0) {
      const searchQuery = getSearchQuery(search, searchFields);
      finalQuery = { $and: [query, searchQuery] };
    }
    
    const skip = (page - 1) * pageSize;
    
    const [data, total] = await Promise.all([
      model
        .find(finalQuery)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean()
        .maxTimeMS(5000),
      model.countDocuments(finalQuery),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error("Error in paginateQuery:", error);
    throw error;
  }
};
