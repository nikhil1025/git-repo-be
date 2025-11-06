import { Request, Response } from "express";
import { Model } from "mongoose";
import {
  buildMongoQuery,
  buildMongoSort,
  paginateQuery,
} from "../helpers/pagination";
import Commit from "../models/Commit";
import Integration from "../models/Integration";
import Issue from "../models/Issue";
import IssueChangelog from "../models/IssueChangelog";
import Organization from "../models/Organization";
import PullRequest from "../models/PullRequest";
import Repository from "../models/Repository";
import User from "../models/User";

// Map collection names to models
const collectionModels: { [key: string]: Model<any> } = {
  organizations: Organization,
  repositories: Repository,
  commits: Commit,
  pullrequests: PullRequest,
  issues: Issue,
  issuechangelogs: IssueChangelog,
  users: User,
};

// Getting list of all available collections
export const getCollections = (req: Request, res: Response): void => {
  try {
    const collections = [
      "organizations",
      "repositories",
      "commits",
      "pullrequests",
      "issues",
      "issuechangelogs",
      "users",
    ];

    res.json({ collections });
  } catch (error: any) {
    console.error("Error getting collections:", error);
    res
      .status(500)
      .json({ error: "Failed to get collections", message: error.message });
  }
};

// Get all field names from schema
const getSchemaFields = (model: Model<any>): string[] => {
  const schema = model.schema;
  const fields: string[] = [];

  // from MongoDB
  schema.eachPath((path) => {
    if (path !== "__v" && path !== "_id") {
      fields.push(path);
    }
  });

  return fields;
};

// Get all searchable text fields
const getSearchableFields = (model: Model<any>): string[] => {
  const schema = model.schema;
  const searchableFields: string[] = [];

  schema.eachPath((path, schemaType) => {
    if (
      path !== "__v" &&
      path !== "_id" &&
      !path.includes(".") &&
      schemaType.instance === "String"
    ) {
      searchableFields.push(path);
    }
  });

  return searchableFields;
};

export const getCollectionData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { collectionName } = req.params;
    const {
      page = "1",
      pageSize = "100",
      sortModel,
      filterModel,
      searchValue,
      userId,
    } = req.query;

    // Validate userId
    if (!userId || typeof userId !== "string") {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const model = collectionModels[collectionName];
    if (!model) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }

    // Get user's active integrations
    const userIntegrations = await Integration.find({
      userId: userId,
      status: "active",
    }).select("_id");

    if (userIntegrations.length === 0) {
      const fields = getSchemaFields(model);
      res.json({
        data: [],
        total: 0,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
        totalPages: 0,
        fields: fields,
      });
      return;
    }

    const integrationIds = userIntegrations.map((int) => int._id);

    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = Math.min(parseInt(pageSize as string, 10), 1000); // limiting for load balance

    let sort = {};
    let filters: any = {
      integrationId: { $in: integrationIds }, // Filter by user's integrations
    };

    if (sortModel && typeof sortModel === "string") {
      try {
        const sortArray = JSON.parse(sortModel);
        sort = buildMongoSort(sortArray);
      } catch (error) {
        console.error("Error parsing sortModel:", error);
      }
    }

    if (filterModel && typeof filterModel === "string") {
      try {
        const filterObj = JSON.parse(filterModel);
        const additionalFilters = buildMongoQuery(filterObj);
        // Merge with integrationId filter
        filters = { ...filters, ...additionalFilters };
      } catch (error) {
        console.error("Error parsing filterModel:", error);
      }
    }

    // preparing search
    const fields = getSchemaFields(model);
    const searchableFields = getSearchableFields(model);

    const result = await paginateQuery(
      model,
      filters,
      pageNum,
      pageSizeNum,
      sort,
      searchValue as string,
      searchableFields
    );

    // caching updatd here
    res.set({
      "Cache-Control": "public, max-age=60", // 1 minute cache update
      "X-Total-Count": result.total.toString(),
    });

    res.json({
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      fields: fields,
    });
  } catch (error: any) {
    console.error("Error getting collection data:", error);
    res
      .status(500)
      .json({ error: "Failed to get collection data", message: error.message });
  }
};

export const getCollectionFields = (req: Request, res: Response): void => {
  try {
    const { collectionName } = req.params;

    const model = collectionModels[collectionName];
    if (!model) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }

    const schema = model.schema;
    const fieldDefs: any[] = [];

    schema.eachPath((path, schemaType) => {
      if (path !== "__v") {
        fieldDefs.push({
          field: path,
          type: schemaType.instance,
          headerName:
            path.charAt(0).toUpperCase() + path.slice(1).replace(/_/g, " "),
        });
      }
    });

    res.json({ fields: fieldDefs });
  } catch (error: any) {
    console.error("Error getting collection fields:", error);
    res.status(500).json({
      error: "Failed to get collection fields",
      message: error.message,
    });
  }
};

export const globalSearch = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { searchValue, userId } = req.body;

    if (!searchValue || typeof searchValue !== "string") {
      res.status(400).json({ error: "searchValue is required" });
      return;
    }

    if (!userId || typeof userId !== "string") {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    // Get user's active integrations
    const userIntegrations = await Integration.find({
      userId: userId,
      status: "active",
    }).select("_id");

    if (userIntegrations.length === 0) {
      res.json({ results: {} });
      return;
    }

    const integrationIds = userIntegrations.map((int) => int._id);
    const limit = 10;

    const searchPromises = Object.entries(collectionModels).map(
      async ([collectionName, model]) => {
        try {
          const searchableFields = getSearchableFields(model);

          if (searchableFields.length === 0) {
            return [
              collectionName,
              {
                count: 0,
                data: [],
              },
            ];
          }

          const searchQuery = {
            $and: [
              { integrationId: { $in: integrationIds } }, // Filter by user's integrations
              {
                $or: searchableFields.map((field) => ({
                  [field]: { $regex: searchValue, $options: "i" },
                })),
              },
            ],
          };

          const data = await model
            .find(searchQuery)
            .limit(limit)
            .lean()
            .maxTimeMS(3000); // error case for long response debounce

          return [
            collectionName,
            {
              count: data.length,
              data: data,
            },
          ];
        } catch (error) {
          console.error(`Error searching ${collectionName}:`, error);
          return [
            collectionName,
            {
              count: 0,
              data: [],
            },
          ];
        }
      }
    );

    // hold till all searches to complete
    const searchResults = await Promise.all(searchPromises);
    const results = Object.fromEntries(searchResults);

    // caching added here
    res.set({
      "Cache-Control": "public, max-age=30", // 30 seconds max timing
    });

    res.json({ results });
  } catch (error: any) {
    console.error("Error in global search:", error);
    res.status(500).json({
      error: "Failed to perform global search",
      message: error.message,
    });
  }
};
