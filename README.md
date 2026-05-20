# ENVIDDA Catalog Framework

This repository contains the code released with the accompanying research paper for the ENVIDDA catalog framework. The project provides a database-centered service layer and a web catalog application for searching, browsing, and visualizing heterogeneous environmental and oceanographic datasets.

The implementation is organized around a deliberate architectural choice: most of the domain logic is implemented inside PostgreSQL, while the backend exposes this logic through REST endpoints and controlled GeoServer proxies. This keeps the data access rules close to the database schemas and provides a stable HTTP interface for the web application.

## Repository Structure

```text
.
|-- SQLServices/   PostgreSQL SQL code used to create the service functions
|-- CatalogApp/    Web catalog application, including backend and frontend code
`-- README.md      Repository overview
```

## SQL Services

The `SQLServices` directory contains the PostgreSQL SQL code used to generate the functions consumed by the REST service. These scripts define the database-side logic for catalog access, metadata filtering, controlled vocabulary retrieval, feature-of-interest queries, process queries, full-text search support, and data availability checks.

In this framework, the database is not treated as a passive persistence layer. Instead, the main service logic is implemented as PostgreSQL functions and views. The backend application calls those functions and exposes the resulting operations through HTTP endpoints. This design helps preserve consistency across datasets and makes the behavior of the catalog services reproducible from the SQL layer.

## Catalog Application

The `CatalogApp` directory contains the web catalog application. It is composed of a Spring Boot backend and a static frontend served by the application.

### Backend

The backend exposes REST endpoints that provide access to the PostgreSQL service functions described above. It acts as a thin application layer over the database logic, validating requests, mapping parameters, serializing responses, and centralizing access to catalog operations.

The backend also includes a controlled proxy for GeoServer services. This proxy is used by the frontend to access geospatial data through GeoServer while keeping service URLs, validation, and access patterns centralized in the application.

Main backend responsibilities include:

- Exposing catalog metadata endpoints.
- Providing dataset, process, vocabulary, and feature-of-interest queries.
- Checking temporal and spatial data availability.
- Proxying GeoServer `WFS`, `WCS`, and `WMS` requests.
- Serving the static frontend application.

Additional backend configuration, endpoint examples, and execution instructions are available in [`CatalogApp/README.md`](CatalogApp/README.md).

### Frontend

The frontend provides the user-facing catalog and dataset exploration interface. It has two main functions.

First, it gives access to dataset metadata so users can search the catalog, inspect available datasets, and navigate through the different dataset descriptions and related metadata.

Second, it consumes data through GeoServer for each dataset and provides dataset-specific visual exploration. Depending on the dataset, the interface combines filters, maps, availability views, and charts adapted to the structure and semantics of the underlying data.

Main frontend responsibilities include:

- Searching and browsing catalog metadata.
- Navigating dataset descriptions and related entities.
- Requesting geospatial data through the backend GeoServer proxy.
- Displaying dataset-specific maps and spatial filters.
- Rendering charts and other visual summaries adapted to each dataset.
- Supporting temporal, spatial, and attribute-based exploration workflows.

## Architectural Overview

The framework follows a layered architecture in which each layer has a specific role:

```text
Frontend catalog interface
        |
        v
Spring Boot REST API and GeoServer proxy
        |
        v
PostgreSQL service functions and views
        |
        v
Environmental and oceanographic datasets

GeoServer is used alongside the database services to publish and retrieve geospatial data for visualization.
```

This separation allows the catalog application to expose a consistent API while delegating dataset-specific access logic to the SQL service layer and geospatial data publication to GeoServer.

## Main Technologies

- PostgreSQL and PostGIS for the database and spatial data model.
- SQL service functions and views for catalog and data access logic.
- Spring Boot for the REST backend.
- GeoServer for geospatial data publication.
- Static web frontend for catalog browsing, filtering, maps, and charts.

## Intended Use

This repository is intended to support reproducibility, inspection, and reuse of the software components described in the associated publication. Researchers and developers may use it to:

- Inspect the SQL service layer used by the framework.
- Reuse or adapt the REST backend for PostgreSQL-backed catalog services.
- Study the integration between database-side service logic, REST endpoints, and GeoServer.
- Explore the catalog web application structure and its dataset-specific visualization components.

## Data Availability

To reproduce the experiments undertaken during the evaluation of this framework, CSV files adapted to the schemas of all approaches may be provided upon request.

Important Note: To request access to the data, please contact the authors at: jrr.viqueira@usc.es.
