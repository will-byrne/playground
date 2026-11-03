# BUILDER (no fat-jar plugin in the pom, so dependencies are copied alongside the classes)
FROM maven:3.9-eclipse-temurin-25 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package dependency:copy-dependencies -DskipTests

# RUNTIME
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/classes ./classes
COPY --from=builder /app/target/dependency ./lib
EXPOSE 3000
ENTRYPOINT ["java", "-cp", "classes:lib/*", "org.example.Main"]
