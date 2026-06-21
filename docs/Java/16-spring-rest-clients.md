---
title: "REST Clients"
sidebar_label: "REST Clients"
sidebar_position: 16
---

# REST Clients

Spring offers several HTTP client abstractions for calling external APIs: the legacy `RestTemplate`, the reactive `WebClient`, the modern `RestClient`, and declarative `@HttpExchange` interfaces.

---

## RestClient (Modern, Spring 6.1+)

`RestClient` is the recommended synchronous HTTP client — combines `RestTemplate`'s simplicity with `WebClient`'s fluent API.

```java
@Configuration
public class RestClientConfig {

    @Bean
    public RestClient restClient(RestClient.Builder builder) {
        return builder
            .baseUrl("https://api.example.com")
            .defaultHeader("Accept", "application/json")
            .requestInterceptor((request, body, execution) -> {
                request.getHeaders().add("X-Client-Id", "my-app");
                return execution.execute(request, body);
            })
            .requestFactory(clientHttpRequestFactory())
            .build();
    }

    private ClientHttpRequestFactory clientHttpRequestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        return factory;
    }
}

@Service
public class WeatherClient {
    private final RestClient restClient;

    public WeatherClient(RestClient restClient) {
        this.restClient = restClient;
    }

    public WeatherResponse getWeather(String city) {
        return restClient.get()
            .uri("/weather?city={city}", city)
            .retrieve()
            .body(WeatherResponse.class);
    }

    public WeatherResponse getWeatherWithErrorHandling(String city) {
        return restClient.get()
            .uri("/weather?city={city}", city)
            .retrieve()
            .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                throw new ClientApiException("Client error: " + res.getStatusCode());
            })
            .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                throw new ServerApiException("Server error: " + res.getStatusCode());
            })
            .body(WeatherResponse.class);
    }

    public List<WeatherResponse> getMultiple() {
        return restClient.get()
            .uri("/weather/batch")
            .retrieve()
            .body(new ParameterizedTypeReference<List<WeatherResponse>>() {});
    }

    public WeatherResponse postData(WeatherRequest request) {
        return restClient.post()
            .uri("/weather")
            .contentType(MediaType.APPLICATION_JSON)
            .body(request)
            .retrieve()
            .body(WeatherResponse.class);
    }

    public ResponseEntity<WeatherResponse> getFullResponse(String city) {
        return restClient.get()
            .uri("/weather?city={city}", city)
            .retrieve()
            .toEntity(WeatherResponse.class);
        // gives access to .getStatusCode(), .getHeaders(), .getBody()
    }

    public void exchange() {
        WeatherResponse result = restClient.get()
            .uri("/weather")
            .exchange((request, response) -> {
                if (response.getStatusCode().is2xxSuccessful()) {
                    return response.bodyTo(WeatherResponse.class);
                }
                throw new RuntimeException("Failed: " + response.getStatusCode());
            });
    }
}
```

---

## WebClient (Reactive)

`WebClient` is the reactive, non-blocking HTTP client — part of Spring WebFlux but usable in any Spring app.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

```java
@Configuration
public class WebClientConfig {

    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        HttpClient httpClient = HttpClient.create()
            .responseTimeout(Duration.ofSeconds(10))
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000);

        return builder
            .baseUrl("https://api.example.com")
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .filter(logRequest())
            .build();
    }

    private ExchangeFilterFunction logRequest() {
        return ExchangeFilterFunction.ofRequestProcessor(request -> {
            log.info("Request: {} {}", request.method(), request.url());
            return Mono.just(request);
        });
    }
}

@Service
public class UserApiClient {
    private final WebClient webClient;

    public UserApiClient(WebClient webClient) {
        this.webClient = webClient;
    }

    // Returns Mono<T> — 0 or 1 result, async
    public Mono<User> getUser(Long id) {
        return webClient.get()
            .uri("/users/{id}", id)
            .retrieve()
            .bodyToMono(User.class);
    }

    // Returns Flux<T> — 0 to N results, async stream
    public Flux<User> getAllUsers() {
        return webClient.get()
            .uri("/users")
            .retrieve()
            .bodyToFlux(User.class);
    }

    public Mono<User> createUser(CreateUserRequest request) {
        return webClient.post()
            .uri("/users")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(User.class);
    }

    // Error handling
    public Mono<User> getUserWithErrorHandling(Long id) {
        return webClient.get()
            .uri("/users/{id}", id)
            .retrieve()
            .onStatus(HttpStatusCode::is4xxClientError, response ->
                Mono.error(new UserNotFoundException("User not found: " + id)))
            .onStatus(HttpStatusCode::is5xxServerError, response ->
                Mono.error(new ExternalServiceException("Upstream error")))
            .bodyToMono(User.class);
    }

    // Timeout
    public Mono<User> getUserWithTimeout(Long id) {
        return webClient.get()
            .uri("/users/{id}", id)
            .retrieve()
            .bodyToMono(User.class)
            .timeout(Duration.ofSeconds(5));
    }

    // Retry
    public Mono<User> getUserWithRetry(Long id) {
        return webClient.get()
            .uri("/users/{id}", id)
            .retrieve()
            .bodyToMono(User.class)
            .retryWhen(Retry.backoff(3, Duration.ofSeconds(1))
                .filter(throwable -> throwable instanceof WebClientResponseException.ServiceUnavailable));
    }

    // Combine multiple async calls
    public Mono<UserProfile> getFullProfile(Long userId) {
        Mono<User>   userMono  = getUser(userId);
        Mono<Orders> orderMono = getOrders(userId);

        return Mono.zip(userMono, orderMono)
            .map(tuple -> new UserProfile(tuple.getT1(), tuple.getT2()));
    }

    // Blocking (only at the very edge — controllers, tests — never in reactive chains)
    public User getUserBlocking(Long id) {
        return getUser(id).block(Duration.ofSeconds(5));
    }
}

// Calling from a reactive controller (non-blocking end-to-end)
@RestController
public class UserController {
    private final UserApiClient client;

    @GetMapping("/users/{id}")
    public Mono<User> getUser(@PathVariable Long id) {
        return client.getUser(id);   // non-blocking all the way through
    }

    @GetMapping(value = "/users/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<User> streamUsers() {
        return client.getAllUsers();   // streams results as Server-Sent Events
    }
}
```

---

## @HttpExchange (Declarative Clients, Spring 6+)

Define an interface; Spring generates the implementation — similar to Feign or Retrofit.

```java
public interface GitHubClient {

    @GetExchange("/users/{username}")
    GitHubUser getUser(@PathVariable String username);

    @GetExchange("/users/{username}/repos")
    List<Repository> getRepos(@PathVariable String username,
                               @RequestParam(defaultValue = "10") int perPage);

    @PostExchange("/repos/{owner}/{repo}/issues")
    Issue createIssue(@PathVariable String owner, @PathVariable String repo,
                       @RequestBody CreateIssueRequest request);

    @PutExchange("/user/starred/{owner}/{repo}")
    void starRepo(@PathVariable String owner, @PathVariable String repo);

    @DeleteExchange("/user/starred/{owner}/{repo}")
    void unstarRepo(@PathVariable String owner, @PathVariable String repo);

    @GetExchange("/search/repositories")
    SearchResult searchRepos(@RequestParam String q, @RequestParam(name = "sort") String sortBy);
}

// Register as a bean — backed by RestClient
@Configuration
public class GitHubClientConfig {

    @Bean
    public GitHubClient gitHubClient() {
        RestClient restClient = RestClient.builder()
            .baseUrl("https://api.github.com")
            .defaultHeader("Authorization", "Bearer " + githubToken)
            .build();

        HttpServiceProxyFactory factory = HttpServiceProxyFactory
            .builderFor(RestClientAdapter.create(restClient))
            .build();

        return factory.createClient(GitHubClient.class);
    }

    // Reactive version — backed by WebClient
    @Bean
    public GitHubReactiveClient gitHubReactiveClient(WebClient webClient) {
        HttpServiceProxyFactory factory = HttpServiceProxyFactory
            .builderFor(WebClientAdapter.create(webClient))
            .build();
        return factory.createClient(GitHubReactiveClient.class);
    }
}

// Usage
@Service
public class GitHubService {
    private final GitHubClient gitHubClient;

    public GitHubService(GitHubClient gitHubClient) {
        this.gitHubClient = gitHubClient;
    }

    public GitHubUser fetchUser(String username) {
        return gitHubClient.getUser(username);   // clean, type-safe, no boilerplate
    }
}
```

---

## RestTemplate (Legacy, still common in older codebases)

```java
@Configuration
public class RestTemplateConfig {
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(10))
            .build();
    }
}

@Service
public class LegacyApiClient {
    private final RestTemplate restTemplate;

    public User getUser(Long id) {
        return restTemplate.getForObject("/users/{id}", User.class, id);
    }

    public ResponseEntity<User> getUserEntity(Long id) {
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

    // Custom headers
    public User getUserWithAuth(Long id, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<User> response = restTemplate.exchange(
            "/users/{id}", HttpMethod.GET, entity, User.class, id);
        return response.getBody();
    }

    // Generic type response (List<User>)
    public List<User> getAllUsers() {
        ResponseEntity<List<User>> response = restTemplate.exchange(
            "/users", HttpMethod.GET, null,
            new ParameterizedTypeReference<List<User>>() {});
        return response.getBody();
    }
}
// NOTE: RestTemplate is in maintenance mode — prefer RestClient or WebClient for new code
```

---

## Resilience Patterns

```xml
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
</dependency>
```

```java
@Service
public class ResilientApiClient {
    private final RestClient restClient;

    // Circuit breaker — stop calling a failing service temporarily
    @CircuitBreaker(name = "weatherApi", fallbackMethod = "getWeatherFallback")
    public WeatherResponse getWeather(String city) {
        return restClient.get().uri("/weather?city={city}", city).retrieve().body(WeatherResponse.class);
    }
    public WeatherResponse getWeatherFallback(String city, Exception ex) {
        return WeatherResponse.unavailable();
    }

    // Retry with backoff
    @Retry(name = "weatherApi", fallbackMethod = "getWeatherFallback")
    public WeatherResponse getWeatherWithRetry(String city) {
        return restClient.get().uri("/weather?city={city}", city).retrieve().body(WeatherResponse.class);
    }

    // Rate limiter
    @RateLimiter(name = "weatherApi")
    public WeatherResponse getWeatherRateLimited(String city) {
        return restClient.get().uri("/weather?city={city}", city).retrieve().body(WeatherResponse.class);
    }

    // Bulkhead — limit concurrent calls
    @Bulkhead(name = "weatherApi")
    public WeatherResponse getWeatherBulkheaded(String city) {
        return restClient.get().uri("/weather?city={city}", city).retrieve().body(WeatherResponse.class);
    }

    // Time limiter (for reactive/async methods)
    @TimeLimiter(name = "weatherApi")
    public CompletableFuture<WeatherResponse> getWeatherAsync(String city) {
        return CompletableFuture.supplyAsync(() ->
            restClient.get().uri("/weather?city={city}", city).retrieve().body(WeatherResponse.class));
    }
}
```

```yaml
resilience4j:
  circuitbreaker:
    instances:
      weatherApi:
        sliding-window-size: 10
        failure-rate-threshold: 50
        wait-duration-in-open-state: 30s
        permitted-number-of-calls-in-half-open-state: 3
  retry:
    instances:
      weatherApi:
        max-attempts: 3
        wait-duration: 1s
        exponential-backoff-multiplier: 2
  ratelimiter:
    instances:
      weatherApi:
        limit-for-period: 10
        limit-refresh-period: 1s
        timeout-duration: 0
```

---

## Summary

- `RestClient` (Spring 6.1+) is the recommended synchronous HTTP client for new code — fluent API, simple, blocking.
- `WebClient` is for reactive/non-blocking pipelines — use `Mono`/`Flux`, never call `.block()` except at the application's outer edge.
- `@HttpExchange` interfaces eliminate boilerplate — declare the contract, Spring generates the implementation.
- `RestTemplate` is in maintenance mode — only use it when maintaining existing code that already depends on it.
- Always configure connect and read timeouts explicitly — default timeouts are often infinite, risking hung threads.
- Use Resilience4j's `@CircuitBreaker`, `@Retry`, and `@RateLimiter` to harden calls to unreliable external services.
- Always provide a fallback method for circuit breakers — a service that's down shouldn't cascade failures through your whole app.
