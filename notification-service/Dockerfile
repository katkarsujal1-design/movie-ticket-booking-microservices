FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src src
RUN mvn -q test && mvn -q -DskipTests package
FROM eclipse-temurin:17-jre
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/* && useradd --system --create-home spring
WORKDIR /app
COPY --from=build /build/target/notification-service-1.0.0.jar app.jar
USER spring
EXPOSE 3005
ENTRYPOINT ["java","-jar","/app/app.jar"]
