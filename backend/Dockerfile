# ─── Stage 1: build the fat jar ──────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache deps first (only re-download when pom.xml changes)
COPY pom.xml .
RUN mvn -q -B dependency:go-offline

COPY src ./src
COPY algoviz_specs ./algoviz_specs
RUN mvn -q -B clean package -DskipTests

# ─── Stage 2: slim runtime ───────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Render sets $PORT; Spring reads it via server.port=${PORT:8085}
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0"
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8085
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
