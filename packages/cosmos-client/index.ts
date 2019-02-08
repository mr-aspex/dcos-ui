import { CosmosClient } from "./src/CosmosClient";

export interface ListVersionsResults {
  [key: string]: string;
}

export interface PackageVersionsResponse {
  results: ListVersionsResults;
}

module.exports = {
  CosmosClient
};