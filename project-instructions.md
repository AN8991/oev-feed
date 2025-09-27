What we want to achieve:

We are trying to build a system that can pull in data from multiple different lending and borrowing protocols like AAVE across multiple networks like Ethereum, Optimism, Arbitrum, Polygon, Avalanche, Base etc for user positions and health factors. We will transform the fetched data into a common format. The core business logic for this data would be to build a prediction model to analyze user positions and find the chances of a wallet going into liquidation based on multiple factors like LTV, Liquidation threshold and overall market volatility.

Always check if there are existing NestJS packages for anything you are trying to build. Dont overengineer things when simplified solutions are present. Code reusability, modularity and simplicity are the key factors.


Silo Finance Important weblinks:
Subgraph Details: https://devdocs.silo.finance/silo-subgraphs/subgraph-introduction
How to query: https://devdocs.silo.finance/silo-subgraphs/querying-silo

Silo Finance V1 Details:
Website: https://v1.silo.finance/
Silo Finance V1 Contracts:
https://silopedia.silo.finance/security/smart-contracts

Silo Finance V1 Docs:
https://silopedia.silo.finance/introduction/what-is-silo

Silo Finance V2 Details:
Website: https://v2.silo.finance/
Silo Finance V2 Contracts:
https://github.com/silo-finance/silo-contracts-v2/tree/develop/common/addresses

Silo Finance V2 Docs: https://docs.silo.finance/docs/category/dev-tutorials

Go through the project codebase and understand what is the objective we want to achieve. Once you have understood the core objective explain how we are going about the implementation. What are the current features we have working and what are the features we want to expand upon in near future. Finally have a look at the 3 files - and determine if they need updation based on current codebase - if they need updating then go ahead and update the same.


Core Objective of the Project
OEV Feed is a DeFi data feed service designed to track, aggregate, and monitor user positions across multiple DeFi protocols (currently focused on Aave V2/V3, with plans for Silo and others). It aims to provide real-time, protocol-agnostic position data—including collateral, debt, and health factors—across multiple blockchains and RPC providers, with high resilience and extensibility.

Latest Project Goals as of 24th September 2025:

As of now the application can handle only one wallet address input at a time. We will now expand the project to include functionality to fetch a list of wallet address from protocols and save it to our database. In our database we already have a table called "users" where we store the wallet addresses and id. We can modify the table to add in 3 new columns - one for the protocol, one for the network (We can reference the same columns in positions model as its already there) and one as lastUpdated (last updated date and time). Once done, users table can be used to store the wallet addresses and protocol and network details along with the last updated date and time which represent when the data was last fetched by our application. Think of us creating a UserDiscoveryService which will fetch the list of users from the protocols and save it to our database.

Now the second part of our job is actually building a script which we can schedule as a job in our system to run at a prefix time. This script will have the logic for fetching data from the protocols and saving it to our database. For now we will only build one for AAVE as this is the focus area, however we will structure the code & project in a way that it can be easily extended to other protocols in the future. Our scripts will be different for different versions of AAVE - so AAVE V2 will have its own script and AAVE V3 will have its own script. Intially the script will have a simple filter criteria- active positions (non-zero collateral or debt) with health factor below 5 with a From and To timestamp that will allow us to select a time range (Intially we will only fetch data from May 2025 to current date). Also we will have multi network support and it should be configurable  (Ethereum initially, extensible to others). We will use Direct contract queries for users with positions because subgraph sections arent yet fully functional within the project.

The primary goal is to get the script working and saving the data to our database. The batch processing work will be done at the very last once we get everything working properly. 

We have to leverage what we have already built and not create new code unecessarily. Always check if there are existing NestJS packages for anything you are trying to build. Dont overengineer things when simplified solutions are present. Code reusability, modularity and simplicity are the key factors.
