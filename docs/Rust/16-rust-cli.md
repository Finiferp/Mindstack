---
title: "CLI Tools with Rust"
sidebar_label: "CLI Tools"
sidebar_position: 16
---

# CLI Tools with Rust

Rust is ideal for CLI tools — fast startup, single binary, no runtime dependency. This is the use case the Rust Book's Chapter 12 builds toward (a grep clone). Tools like `ripgrep`, `fd`, `bat`, and `exa` are all Rust CLI applications.

**Book:** Chapter 12 — [doc.rust-lang.org/book/ch12-00-an-io-project.html](https://doc.rust-lang.org/book/ch12-00-an-io-project.html)

---

## Project Setup

```bash
cargo new my-tool
cd my-tool
cargo add clap --features derive      # argument parsing
cargo add anyhow                       # error handling
cargo add colored                      # terminal colours (optional)
```

```toml
# Cargo.toml
[package]
name = "my-tool"
version = "0.1.0"
edition = "2021"

[dependencies]
clap = { version = "4", features = ["derive"] }
anyhow = "1"
colored = "2"

[profile.release]
opt-level = 3
lto = true
strip = true          # smaller binary
```

---

## Argument Parsing with Clap

```rust
use clap::{Parser, Subcommand, Args};

/// My awesome CLI tool
#[derive(Parser, Debug)]
#[command(name = "my-tool", version, about, long_about = None)]
struct Cli {
    /// Enable verbose output
    #[arg(short, long)]
    verbose: bool,

    /// Output format
    #[arg(short, long, default_value = "text")]
    format: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Search for a pattern in files
    Search(SearchArgs),

    /// Count lines in files
    Count {
        /// Files to count
        #[arg(required = true)]
        files: Vec<std::path::PathBuf>,
    },
}

#[derive(Args, Debug)]
struct SearchArgs {
    /// Pattern to search for
    pattern: String,

    /// Files to search (defaults to stdin)
    #[arg(default_value = "-")]
    files: Vec<String>,

    /// Case-insensitive search
    #[arg(short = 'i', long)]
    ignore_case: bool,

    /// Show line numbers
    #[arg(short = 'n', long)]
    line_numbers: bool,

    /// Maximum number of matches
    #[arg(short, long)]
    max_count: Option<usize>,
}

fn main() {
    let cli = Cli::parse();

    if cli.verbose {
        eprintln!("Verbose mode on, format: {}", cli.format);
    }

    match cli.command {
        Commands::Search(args) => run_search(args),
        Commands::Count { files } => run_count(files),
    }
}

fn run_search(args: SearchArgs) {
    println!("Searching for '{}' (ignore_case={})", args.pattern, args.ignore_case);
}

fn run_count(files: Vec<std::path::PathBuf>) {
    println!("Counting lines in {:?}", files);
}
```

```bash
# Usage generated automatically:
my-tool --help
my-tool search --help
my-tool -v search "hello" file.txt --ignore-case --line-numbers
my-tool count src/*.rs
```

---

## File I/O

```rust
use std::fs::{self, File};
use std::io::{self, BufRead, BufReader, BufWriter, Write};
use std::path::Path;
use anyhow::{Context, Result};

// Read entire file to String
fn read_file(path: &Path) -> Result<String> {
    fs::read_to_string(path)
        .with_context(|| format!("failed to read {}", path.display()))
}

// Read file line by line (memory efficient for large files)
fn read_lines(path: &Path) -> Result<Vec<String>> {
    let file = File::open(path)
        .with_context(|| format!("failed to open {}", path.display()))?;
    let reader = BufReader::new(file);
    reader.lines()
        .collect::<std::io::Result<Vec<_>>>()
        .with_context(|| format!("failed to read lines from {}", path.display()))
}

// Process large file without loading all into memory
fn process_large_file(path: &Path) -> Result<u64> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);
    let mut line_count = 0u64;

    for line in reader.lines() {
        let _line = line?;
        line_count += 1;
    }
    Ok(line_count)
}

// Write file
fn write_file(path: &Path, content: &str) -> Result<()> {
    fs::write(path, content)
        .with_context(|| format!("failed to write {}", path.display()))
}

// Write file with buffering (for many small writes)
fn write_lines(path: &Path, lines: &[String]) -> Result<()> {
    let file = File::create(path)?;
    let mut writer = BufWriter::new(file);
    for line in lines {
        writeln!(writer, "{}", line)?;
    }
    writer.flush()?;  // flush the buffer
    Ok(())
}

// Check if path exists
fn file_exists(path: &Path) -> bool {
    path.exists()
}

// Walk a directory recursively
fn walk_dir(root: &Path) -> Result<Vec<std::path::PathBuf>> {
    let mut files = vec![];
    for entry in fs::read_dir(root)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            files.extend(walk_dir(&path)?);
        } else {
            files.push(path);
        }
    }
    Ok(files)
}
// Or use the 'walkdir' crate for a cleaner API:
// use walkdir::WalkDir;
// for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) { ... }
```

---

## Reading stdin

```rust
use std::io::{self, BufRead, Read};

// Read all of stdin at once
fn read_stdin_string() -> String {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    input
}

// Read stdin line by line
fn read_stdin_lines() {
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = line.unwrap();
        println!("got: {line}");
    }
}

// Handle both file and stdin (common pattern: "-" means stdin)
fn open_input(path: &str) -> Box<dyn BufRead> {
    if path == "-" {
        Box::new(io::BufReader::new(io::stdin()))
    } else {
        let file = std::fs::File::open(path).expect("cannot open file");
        Box::new(io::BufReader::new(file))
    }
}

fn main() {
    let reader = open_input("-");  // read from stdin
    for line in reader.lines() {
        println!("{}", line.unwrap());
    }
}
```

---

## Environment Variables and Exit Codes

```rust
use std::env;
use std::process;

fn main() {
    // Read environment variable
    let debug = env::var("DEBUG").is_ok();
    let home = env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .unwrap_or(8080);

    // All environment variables
    for (key, value) in env::vars() {
        if key.starts_with("MY_APP_") {
            println!("{key}={value}");
        }
    }

    // Command-line arguments (manual — prefer clap)
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: {} <file>", args[0]);
        process::exit(1);           // non-zero = error
    }

    // Exit codes
    process::exit(0);               // success
    process::exit(1);               // generic error
    process::exit(2);               // usage error (convention)

    // Return errors from main instead of exit()
    // fn main() -> anyhow::Result<()> { ... Ok(()) }
    // Non-zero exit code set automatically if main returns Err
}
```

---

## Terminal Output

```rust
use colored::Colorize;

fn main() {
    // Colored output with the 'colored' crate
    println!("{}", "Error!".red().bold());
    println!("{}", "Warning".yellow());
    println!("{}", "Success".green());
    println!("{}", format!("Processing {}", "file.txt").cyan());

    // Respects NO_COLOR env var and non-TTY detection automatically

    // Progress bars with 'indicatif' crate:
    use indicatif::{ProgressBar, ProgressStyle};
    let pb = ProgressBar::new(100);
    pb.set_style(ProgressStyle::with_template(
        "[{elapsed_precise}] {bar:40.cyan/blue} {pos}/{len} {msg}"
    ).unwrap());

    for i in 0..100 {
        pb.set_message(format!("processing item {i}"));
        pb.inc(1);
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
    pb.finish_with_message("done");

    // Interactive prompts with 'dialoguer' crate:
    // use dialoguer::{Confirm, Input, Select};
    // let name: String = Input::new().with_prompt("Your name").interact()?;
    // let confirmed = Confirm::new().with_prompt("Continue?").interact()?;
}
```

---

## A Complete Mini grep Example

```rust
// Mirrors what the Rust Book builds in Chapter 12
use std::error::Error;
use std::fs;
use std::env;

struct Config {
    query: String,
    file_path: String,
    ignore_case: bool,
}

impl Config {
    fn build(args: &[String]) -> Result<Config, &'static str> {
        if args.len() < 3 {
            return Err("Usage: minigrep <query> <file>");
        }
        Ok(Config {
            query: args[1].clone(),
            file_path: args[2].clone(),
            ignore_case: env::var("IGNORE_CASE").is_ok(),
        })
    }
}

fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    contents
        .lines()
        .filter(|line| line.contains(query))
        .collect()
}

fn search_case_insensitive<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let query = query.to_lowercase();
    contents
        .lines()
        .filter(|line| line.to_lowercase().contains(&query))
        .collect()
}

fn run(config: Config) -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string(&config.file_path)?;

    let results = if config.ignore_case {
        search_case_insensitive(&config.query, &contents)
    } else {
        search(&config.query, &contents)
    };

    for line in results {
        println!("{line}");
    }
    Ok(())
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let config = Config::build(&args).unwrap_or_else(|err| {
        eprintln!("Problem parsing arguments: {err}");
        std::process::exit(1);
    });

    if let Err(e) = run(config) {
        eprintln!("Application error: {e}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn case_sensitive() {
        let query = "duct";
        let contents = "Rust:\nsafe, fast, productive.\nPick three.\nDuct tape.";
        assert_eq!(vec!["safe, fast, productive."], search(query, contents));
    }

    #[test]
    fn case_insensitive() {
        let query = "rUsT";
        let contents = "Rust:\nsafe, fast, productive.\nTrust me.";
        assert_eq!(vec!["Rust:", "Trust me."], search_case_insensitive(query, contents));
    }
}
```

---

## Tips

- Always write to `stderr` for error messages and diagnostics (`eprintln!`), and `stdout` for actual output — this lets users pipe output while still seeing errors.
- Use `anyhow::Result` as the return type of `main` — the binary prints a formatted error and exits with code 1 automatically.
- `clap` with `#[derive(Parser)]` generates help text, version, shell completions, and validation — use it instead of manual `env::args()` for anything non-trivial.
- For binary size: `lto = true` + `strip = true` in `[profile.release]` typically cuts the binary in half.
- The `indicatif` crate for progress bars and `dialoguer` for interactive prompts are the de-facto standard in the Rust CLI ecosystem.

---

## Summary

- Rust CLI tools compile to a single static binary with no runtime — ideal for distribution.
- `clap` with `#[derive(Parser)]` handles arguments, subcommands, and help text automatically.
- `anyhow::Result` in `main` gives you `?` propagation and automatic error formatting with exit code 1.
- `BufReader`/`BufWriter` for line-by-line processing of large files — never load the whole file unless necessary.
- `eprintln!` for errors and diagnostics; `println!` for output — respects Unix conventions for piping.
- Build for release: `cargo build --release` + `lto = true` + `strip = true` → fast, small binary.
