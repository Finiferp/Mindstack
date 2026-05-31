---
title: "Spring — Consuming REST APIs"
sidebar_label: "REST Clients"
sidebar_position: 16
---

# Consuming REST APIs in Spring

Most backend services don't just serve data — they also consume it from other services. Spring provides several HTTP client abstractions: the modern `RestClient` (Spring 6.1+), the reactive `WebClient`, and the declarative `@HttpExchange` interface. Each suits different scenarios.

---

## RestClient (Spring 6.1+ / Boot 3.2+)

`RestClient` is the modern, fluent, synchronous HTTP client. It replaces the deprecated `RestTemplate`.

### Setup

```java
@Configuration
public class RestClientConfig {

    @Bean
    public RestClient githubClient() {
        return RestClient.builder()
            .baseUrl("https://api.github.com")
            .defaultHeader("Accept", "application/vnd.github+json")
            .defaultHeader("Authorization", "Bearer " + githubToken)
            .build();
    }

    @Bean
    public RestClient paymentClient() {
        return RestClient.builder()
            .baseUrl("https://api.stripe.com/v1")
            .defaultHeader("Authorization", "Bearer " + stripeKey)
            .requestInterceptor((request, body, execution) -> {
                // Add custom logic (logging, retry, etc.)
                log.info("Calling: {} {}", request.getMethod(), request.getURI());
                return execution.execute(request, body);
            })
            .build();
    }
}
```

### Making Requests

```java
@Service
public class GithubService {

    private final RestClient githubClient;

    public GithubService(RestClient githubClient) {
        this.githubClient = githubClient;
    }

    // GET — retrieve object
    public GithubUser getUser(String username) {
        return githubClient.get()
            .uri("/users/{username}", username)
            .retrieve()
            .body(GithubUser.class);
    }

    // GET — retrieve list
    public List<GithubRepo> getRepos(String username) {
        return githubClient.get()
            .uri("/users/{username}/repos?per_page=100", username)
            .retrieve()
            .body(new ParameterizedTypeReference<List<GithubRepo>>() {});
    }

    // GET with query params
    public List<GithubRepo> searchRepos(String query, String language) {
        return githubClient.get()
            .uri(uriBuilder -> uriBuilder
                .path("/search/repositories")
                .queryParam("q", query + " language:" + language)
                .queryParam("sort", "stars")
                .queryParam("order", "desc")
                .build())
            .retrieve()
            .body(SearchResult.class)
            .items();
    }

    // POST — send body
    public GithubIssue createIssue(String owner, String repo, CreateIssueRequest request) {
        return githubClient.post()
            .uri("/repos/{owner}/{repo}/issues", owner, repo)
            .contentType(MediaType.APPLICATION_JSON)
            .body(request)
            .retrieve()
            .body(GithubIssue.class);
    }

    // PUT
    public void updateFile(String owner, String repo, String path, UpdateFileRequest request) {
        githubClient.put()
            .uri("/repos/{owner}/{repo}/contents/{path}", owner, repo, path)
            .body(request)
            .retrieve()
            .toBodilessEntity();
    }

    // DELETE
    public void deleteIssue(String owner, String repo, int issueNumber) {
        githubClient.delete()
            .uri("/repos/{owner}/{repo}/issues/{number}/lock", owner, repo, issueNumber)
            .retrieve()
            .toBodilessEntity();
    }

    // Access full ResponseEntity (status, headers, body)
    public ResponseEntity<GithubUser> getUserWithMeta(String username) {
        return githubClient.get()
            .uri("/users/{username}", username)
            .retrieve()
            .toEntity(GithubUser.class);
    }
}
```

### Error Handling

```java
@Service
public class PaymentService {

    private final RestClient paymentClient;

    public ChargeResponse charge(ChargeRequest request) {
        return paymentClient.post()
            .uri("/charges")
            .body(request)
            .retrieve()
            .onStatus(HttpStatusCode::is4xxClientError, (req, resp) -> {
                String body = new String(resp.getBody().readAllBytes());
                throw new PaymentClientException("Payment rejected: " + body, resp.getStatusCode());
            })
            .onStatus(HttpStatusCode::is5xxServerError, (req, resp) -> {
                throw new PaymentServiceException("Payment service unavailable");
            })
            .body(ChargeResponse.class);
    }
}

// Or configure globally in the builder
RestClient.builder()
    .defaultStatusHandler(HttpStatusCode::isError, (req, resp) -> {
        throw new HttpClientException(resp.getStatusCode(), "Request failed");
    })
    .build();
```

---

## WebClient (Reactive / Non-Blocking)

`WebClient` is part of Spring WebFlux. It's non-blocking and ideal for high-concurrency I/O, reactive pipelines, or when you need to fire many parallel requests efficiently.

### Setup

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

```java
@Bean
public WebClient weatherClient() {
    return WebClient.builder()
        .baseUrl("https://api.openweathermap.org")
        .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
        .codecs(codecs -> codecs.defaultCodecs().maxInMemorySize(1024 * 1024)) // 1MB
        .filter(ExchangeFilterFunction.ofRequestProcessor(req -> {
            log.info("Request: {} {}", req.method(), req.url());
            return Mono.just(req);
        }))
        .build();
}
```

### Making Reactive Requests

```java
@Service
public class WeatherService {

    private final WebClient weatherClient;

    // Return Mono<T> — a single async result
    public Mono<WeatherResponse> getCurrentWeather(String city) {
        return weatherClient.get()
            .uri(uri -> uri
                .path("/data/2.5/weather")
                .queryParam("q", city)
                .queryParam("appid", apiKey)
                .queryParam("units", "metric")
                .build())
            .retrieve()
            .onStatus(HttpStatusCode::is4xxClientError,
                resp -> resp.bodyToMono(String.class)
                    .map(body -> new WeatherApiException("Client error: " + body)))
            .bodyToMono(WeatherResponse.class)
            .timeout(Duration.ofSeconds(5))
            .retry(3);
    }

    // Return Flux<T> — a stream of results
    public Flux<WeatherEvent> streamWeatherUpdates(String city) {
        return weatherClient.get()
            .uri("/stream/weather?city={city}", city)
            .retrieve()
            .bodyToFlux(WeatherEvent.class);
    }

    // Parallel requests — zip multiple async calls
    public Mono<WeatherDashboard> getDashboard(List<String> cities) {
        List<Mono<WeatherResponse>> requests = cities.stream()
            .map(this::getCurrentWeather)
            .toList();

        return Mono.zip(requests, results ->
            new WeatherDashboard(Arrays.asList(results))
        );
    }

    // Block when you need synchronous result (use sparingly)
    public WeatherResponse getCurrentWeatherBlocking(String city) {
        return getCurrentWeather(city).block();
    }
}
```

---

## @HttpExchange — Declarative HTTP Clients (Spring 6+)

Define your HTTP client as an interface; Spring generates the implementation. Similar to Spring Data repositories but for HTTP.

```java
// Define the interface
@HttpExchange(url = "https://api.github.com", accept = "application/vnd.github+json")
public interface GithubClient {

    @GetExchange("/users/{username}")
    GithubUser getUser(@PathVariable String username);

    @GetExchange("/users/{username}/repos")
    List<GithubRepo> getRepos(@PathVariable String username,
                               @RequestParam int perPage);

    @PostExchange("/repos/{owner}/{repo}/issues")
    GithubIssue createIssue(@PathVariable String owner,
                             @PathVariable String repo,
                             @RequestBody CreateIssueRequest request);

    @DeleteExchange("/repos/{owner}/{repo}/issues/{number}/lock")
    void unlockIssue(@PathVariable String owner,
                     @PathVariable String repo,
                     @PathVariable int number);
}
```

```java
// Register as a Spring bean
@Configuration
public class GithubClientConfig {

    @Bean
    public GithubClient githubClient() {
        RestClient restClient = RestClient.builder()
            .baseUrl("https://api.github.com")
            .defaultHeader("Authorization", "Bearer " + token)
            .build();

        RestClientAdapter adapter = RestClientAdapter.create(restClient);
        HttpServiceProxyFactory factory = HttpServiceProxyFactory.builderFor(adapter).build();

        return factory.createClient(GithubClient.class);
    }
}

// Inject and use like any Spring bean
@Service
public class GithubService {

    @Autowired
    private GithubClient githubClient;

    public GithubUser fetchUser(String username) {
        return githubClient.getUser(username);
    }
}
```

---

## RestTemplate (Legacy)

`RestTemplate` is the older synchronous client. You'll encounter it in legacy codebases. It's deprecated since Spring 5.0 in favor of `RestClient` / `WebClient`.

```java
@Bean
public RestTemplate restTemplate(RestTemplateBuilder builder) {
    return builder
        .rootUri("https://api.example.com")
        .connectTimeout(Duration.ofSeconds(5))
        .readTimeout(Duration.ofSeconds(10))
        .build();
}

// Usage
@Service
public class LegacyService {

    private final RestTemplate restTemplate;

    public User getUser(Long id) {
        return restTemplate.getForObject("/users/{id}", User.class, id);
    }

    public ResponseEntity<User> getUserWithStatus(Long id) {
        return restTemplate.getForEntity("/users/{id}", User.class, id);
    }

    public User createUser(CreateUserRequest request) {
        return restTemplate.postForObject("/users", request, User.class);
    }

    public void updateUser(Long id, UpdateUserRequest request) {
        restTemplate.put("/users/{id}", request, id);
    }

    public void deleteUser(Long id) {
        restTemplate.delete("/users/{id}", id);
    }

    // Generic — for parameterized types like List<T>
    public List<User> getAllUsers() {
        return restTemplate.exchange(
            "/users",
            HttpMethod.GET,
            null,
            new ParameterizedTypeReference<List<User>>() {}
        ).getBody();
    }
}
```

**Tips:**
- Migrate from `RestTemplate` to `RestClient` — same synchronous model, cleaner API.
- Use `WebClient` for reactive applications or when making many parallel HTTP calls.
- Use `@HttpExchange` for clean, testable HTTP client interfaces — it's the Spring equivalent of Feign.
- Always set timeouts — an unresponsive external service will hang your threads indefinitely without them.
- Add retry logic with exponential backoff for transient failures.

---

## Retry and Resilience

```xml
<dependency>
    <groupId>org.springframework.retry</groupId>
    <artifactId>spring-retry</artifactId>
</dependency>
```

```java
@SpringBootApplication
@EnableRetry
public class MyApp {}

@Service
public class ExternalApiService {

    @Retryable(
        retryFor = {HttpServerErrorException.class, ResourceAccessException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)  // 1s, 2s, 4s
    )
    public ApiResponse callExternalApi(String endpoint) {
        return restClient.get().uri(endpoint).retrieve().body(ApiResponse.class);
    }

    @Recover
    public ApiResponse fallback(HttpServerErrorException ex, String endpoint) {
        // Called when all retries are exhausted
        log.error("All retries failed for {}: {}", endpoint, ex.getMessage());
        return ApiResponse.empty();
    }
}
```

---

## Summary

Spring provides a full toolkit for consuming HTTP APIs:

- **RestClient** — modern, fluent synchronous client for most use cases.
- **WebClient** — reactive, non-blocking client for high-concurrency or reactive pipelines.
- **@HttpExchange** — declarative interface-based client; clean and testable.
- **RestTemplate** — legacy client, still working, migrate to RestClient when possible.

**Key Takeaways:**
- Use `RestClient` for new synchronous code — it's clean and modern.
- Use `WebClient` in reactive apps or when parallelizing many outbound calls.
- Always configure timeouts — the default is to wait forever.
- Use `@HttpExchange` interfaces when you have multiple methods calling the same API — it centralizes the contract.
- Add retry logic for transient errors from external services.
