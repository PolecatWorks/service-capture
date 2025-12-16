use std::{path::PathBuf, process::ExitCode};

use clap::{Parser, Subcommand};

// use ffi_log2::log_param;
// use hamsrs::hams_logger_init;

use ffi_log2::log_param;
use hamsrs::hams_logger_init;
use service_capture::config::MyConfig;
use service_capture::persistence::start_db_migrate;
use service_capture::{
    error::MyError,
    // persistence::{start_db_backup, start_db_check_tables, start_db_migrate},
    // webserver::service_start,
};
use tracing::{Level, debug, error, info};

use service_capture::{NAME, VERSION, service_start};
use tracing_subscriber::EnvFilter;

/// Application definition to defer to set of commands under [Commands]
#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[command(subcommand)]
    command: Commands,
}

/// Commands to run inside this program
#[derive(Debug, Subcommand)]
enum Commands {
    /// Show version of application
    Version,
    /// Migrate the sql actions to the DB
    Migrate {
        /// Sets a custom config file
        #[arg(short, long, value_name = "FILE")]
        config: PathBuf,
        /// Sets a custom secrets directory
        #[arg(short, long, value_name = "DIR", default_value = PathBuf::from("secrets").into_os_string())]
        secrets: PathBuf,
    },
    /// Start the http service
    Start {
        /// Sets a custom config file
        #[arg(short, long, value_name = "FILE")]
        config: PathBuf,
        /// Sets a custom secrets directory
        #[arg(short, long, value_name = "DIR", default_value = PathBuf::from("secrets").into_os_string())]
        secrets: PathBuf,
    },
    /// DB Check
    DbCheck {
        /// Sets a custom config file
        #[arg(short, long, value_name = "FILE")]
        config: PathBuf,
        /// Sets a custom secrets directory
        #[arg(short, long, value_name = "DIR", default_value = PathBuf::from("secrets").into_os_string())]
        secrets: PathBuf,
    },
    /// DB Backup
    Backup {
        /// Sets a custom config file
        #[arg(short, long, value_name = "FILE")]
        config: PathBuf,
        /// Sets a custom secrets directory
        #[arg(short, long, value_name = "DIR", default_value = PathBuf::from("secrets").into_os_string())]
        secrets: PathBuf,

        /// define the backup directory
        #[arg(value_name = "BACKUPDIR")]
        backup_dir: PathBuf,
    },
    ConfigCheck {
        /// Sets a custom config file
        #[arg(short, long, value_name = "FILE")]
        config: PathBuf,
        /// Sets a custom secrets directory
        #[arg(short, long, value_name = "DIR", default_value = PathBuf::from("secrets").into_os_string())]
        secrets: PathBuf,
    },
}

fn main() -> Result<ExitCode, MyError> {
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .with_env_filter(EnvFilter::from_env("CAPTURE_LOG"))
        // This allows you to use, e.g., `RUST_LOG=info` or `RUST_LOG=debug`
        // when running the app to set log levels.
        // .with_env_filter(
        //     EnvFilter::try_from_default_env()
        //         .or_else(|_| EnvFilter::try_new("axum_tracing_example=error,tower_http=warn"))
        //         .unwrap(),
        // )
        .init();

    let args = Args::parse();
    match args.command {
        Commands::Version => {
            println!("{NAME} Version: :{VERSION}");
            println!("HaMs Version: {}", hamsrs::hams_version());
        }
        Commands::Start { config, secrets } => {
            info!("Starting {NAME}:{VERSION}");
            // info!("Starting {}", hamsrs::hams_version());

            hams_logger_init(log_param()).unwrap();

            let config_yaml = match std::fs::read_to_string(config.clone()) {
                Ok(content) => content,
                Err(e) => {
                    error!("Failed to read config file {:?}: {}", config, e);
                    return Err(MyError::Io(e));
                }
            };

            let config: MyConfig = MyConfig::figment(&config_yaml, secrets)
                .extract()
                .unwrap_or_else(|err| {
                    error!("Config file {config:?} failed with error \n{err:#?}");
                    panic!("Config failed to load");
                });

            debug!("Loaded config {:?}", config);

            if config.persistence.db.automigrate {
                info!(
                    "Auto-migrating database: {}",
                    config.persistence.db.connection.url
                );
                start_db_migrate(&config.persistence)?;
            }

            service_start(&config)?;
        }
        Commands::DbCheck { config, secrets } => {
            info!("Starting {NAME} for {VERSION}");

            let config_yaml = std::fs::read_to_string(config.clone())?;

            let config: MyConfig = MyConfig::figment(&config_yaml, secrets).extract()?;

            debug!("Loaded config {:#?}", config);

            // start_db_check_tables(&config.persistence)?;
        }
        Commands::ConfigCheck { config, secrets } => {
            info!("Config check {NAME} for {VERSION}");

            let config_yaml = std::fs::read_to_string(config.clone())?;

            let config: MyConfig = MyConfig::figment(&config_yaml, secrets).extract()?;

            debug!("Loaded config {:#?}", config);
        }
        Commands::Migrate { config, secrets } => {
            info!("Starting Migration for {NAME}:{VERSION}");

            let config_yaml = std::fs::read_to_string(config.clone())?;

            let config: MyConfig = MyConfig::figment(&config_yaml, secrets).extract()?;

            debug!("Loaded config {:#?}", config);

            // start_db_migrate(&config.persistence)?;
        }
        Commands::Backup {
            config,
            secrets,
            backup_dir,
        } => {
            info!("Starting DB Backup for {NAME}:{VERSION}");

            let config_yaml = std::fs::read_to_string(config.clone())?;

            let config: MyConfig = MyConfig::figment(&config_yaml, secrets).extract()?;

            debug!("Loaded config {:#?}", config);

            // start_db_backup(&config.persistence, &backup_dir)?;
        }
    }

    Ok(ExitCode::SUCCESS)
}
