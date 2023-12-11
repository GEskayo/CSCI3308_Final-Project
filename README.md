# Final-Project
CSGO price tracker 

Application name: Skinee Dipping

App Description:

This project aims to revolutionize the experience of Counter-Strike: Global Offensive (CS:GO) players by providing an intuitive and user-friendly platform for accessing, filtering, and purchasing in-game skins. The core feature is a sophisticated yet easy-to-use search engine, allowing players to quickly navigate through an extensive database of skins based on various parameters like rarity, color, pattern, or price range. Users can apply multiple filters simultaneously to refine their search, making it effortless to find skins that align with their specific tastes and budget.

Additionally, the platform offers detailed views of each skin, including high-resolution images, background information, and user reviews, enabling players to make informed decisions. A unique comparison tool is also available, allowing users to juxtapose different skins side-by-side for a more comprehensive evaluation.

For those interested in acquiring skins, the platform facilitates a seamless purchasing process. It integrates a secure transaction system, ensuring a safe and reliable exchange. Users can buy skins directly from the platform or through trusted third-party vendors, all within a few clicks. This project not only enhances the accessibility of CS:GO skins but also enriches the overall gaming experience by making skin selection and acquisition more enjoyable and less time-consuming.


## Technology Stack

- **Programming Languages**: JavaScript (Node.js), EJS, CSS, SQL
- **Web Framework**: Javascript
- **Frontend Framework**: EJS, CSS, HTML
- **Database**: PostgreSQL for storing skin pricing data
- **API Development**: Flask-RESTful for building the API endpoints
- **Web Development Tools**: HTML, CSS, JavaScript, Bootstrap for frontend design
- **Data Analysis and Visualization**: SQL
- **Containerization**: Docker for creating development and deployment environments
- **Version Control**: Git and GitHub for source code management
- **Hosting and Deployment**: AWS for cloud hosting, Docker Compose for container orchestration (localhost)
  

Prerequisites:
- Javascript (Node.js)
- PostgreSQL for the database
- Official API *The steam API*
- HTML, CSS, Javascript, Bootstrap for front-end applications
- Containers will be using docker, so having the latest version of docker
- Git and Github for collaborative work with other members

To run the container using docker make sure the "docker-compose-yaml" file has the correct code to run properly (the code is given in the final project). Make sure 
that all other containers currently running are shut down in order to run current container for this project.
To run the test make sure the docker is running and open the localhost then start testing the code on your browser

**NOTE**: Due to some of the changes made for the project, there will be two files for Docker. For using and testing cases, the file named "Dockerfile", you will need to change the startup in that file, not the docker-compose.yaml file.
**NOTE**: ONE API KEY PER PERSON otherwise you will get banned by the steam API admins for account sharing. Simply make an account or login to an existing account for steam on the external API website and use that API key attached to your account.
