# Java Server

A Spring Boot implementation of the Pokemon API server that matches the Rust server functionality using pokeapi-reactor.

## Features

- **Pokemon Caching**: Caches Pokemon data in MongoDB to reduce API calls
- **PokeAPI Integration**: Uses pokeapi-reactor to fetch Pokemon data from https://pokeapi.co/
- **Reactive Programming**: Built with Spring WebFlux for non-blocking I/O
- **CORS Support**: Configured to allow requests from any origin
- **RESTful API**: Provides endpoints for Pokemon queries

## Stack

- **Framework**: Spring Boot 3.2.0
- **Data Access**: Spring Data MongoDB Reactive
- **API Client**: pokeapi-reactor 3.3.1
- **Programming**: Java 21 with Lombok
- **Build**: Maven

## API Endpoints

### GET `/`
Returns a greeting message.
```
Response: "Hello, World!"
```

### GET `/pokemon/random-new`
Returns a random Pokemon that hasn't been cached yet.
```
Response: PokeboxEntry JSON
```

### GET `/pokemon/{idOrName}`
Returns Pokemon data by ID or name. If not in cache, fetches from PokeAPI and caches it.
```
Params:
  - idOrName: Pokemon ID (number) or name (string)
  
Response: PokeboxEntry JSON
```

### GET `/pokedex`
Returns a list of all cached Pokemon (ID and name only).
```
Response: Array of PokedexEntry JSON
```

## Prerequisites

- Java 21+
- Maven 3.6+
- MongoDB instance running on `mongodb://admin:testtest@localhost:27017`

## Installation

### Using Docker Compose

```bash
docker-compose up java-server
```

This will:
1. Start a MongoDB instance
2. Build and run the Java server

The server will be available at `http://localhost:3000`

### Manual Setup

1. Start MongoDB:
```bash
docker run -d \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=testtest \
  -p 27017:27017 \
  mongo:latest
```

2. Build the project:
```bash
mvn clean package
```

3. Run the server:
```bash
mvn spring-boot:run
```

## Commands

### Build
```bash
mvn clean package
```

### Run
```bash
mvn spring-boot:run
```

### Run Tests
```bash
mvn test
```

### Format/Check Code
```bash
mvn clean verify
```

## Configuration

The server uses `application.yml` for configuration. Key settings:

- `server.port`: Server port (default: 3000)
- `spring.data.mongodb.uri`: MongoDB connection string
- `logging.level`: Logging configuration

## Data Models

### PokeboxEntry
Full Pokemon details including abilities, types, sprites, etc.

### PokedexEntry
Simple pokedex entry with just ID and name.

### PokemonAbility
Pokemon ability information with name, flavor text, and effect.

## Development

### Project Structure
```
src/main/java/com/pokemon/
├── controller/    # REST endpoints
├── service/       # Business logic
├── repository/    # MongoDB data access
├── model/         # Data models
├── config/        # Spring configuration
└── JavaServerApplication.java
```

### Troubleshooting

**Cannot connect to MongoDB:**
- Ensure MongoDB is running and accessible at the configured URI
- Check credentials: admin/testtest

**Build fails:**
- Clear Maven cache: `mvn clean`
- Ensure Java 21+ is installed: `java -version`

**Port already in use:**
- Change `server.port` in `application.yml`
- Or kill the process using port 3000

## Performance Notes

The server uses reactive programming (Spring WebFlux) with non-blocking I/O for:
- Efficient handling of concurrent requests
- Better resource utilization
- Smooth scaling capabilities

## Future Enhancements

- Add caching headers for client-side caching
- Implement request rate limiting
- Add authentication/authorization
- Performance monitoring and metrics
- Additional filtering/sorting endpoints
