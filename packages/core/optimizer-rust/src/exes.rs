#![allow(unused)]

use csv::ReaderBuilder;
use serde::{Deserialize, Serialize};
use serde_json;
use std::error::Error;
use std::path::{Path};
use std::{collections::HashMap, fs::File};

////////////////////////////////////
/// JSON STRUCTS
////////////////////////////////////

// Search Key STRUCTS
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchKey {
    pub name: String,
    pub value: String,
}
// FORCE RESULT STRUCTS
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    // Each key maps to a vector of serde_json::Value to accommodate different types.
    pub search: Vec<SearchKey>,
    pub timesTriggered: u32,
    pub bookIds: Vec<u32>,
}

// FORCE RESULT STRUCTS
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IdentityCondition {
    pub search: Vec<SearchKey>,
    pub opposite: bool,
    pub win_range_start: f64,
    pub win_range_end: f64,
}

// CONFIG FILE STRUCTS

#[derive(Debug, Deserialize, Serialize)]
pub struct BetMode {
    pub bet_mode: String,
    pub cost: f64,
    pub rtp: f64,
    pub max_win: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct FenceJson {
    pub name: String,
    pub hr: Option<String>, // Option, as it can be a number or a string "x"
    pub rtp: Option<String>,
    pub avg_win: Option<String>,
    pub identity_condition: IdentityCondition,
    pub min_mean_to_median: Option<String>,
    pub max_mean_to_median: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct FencesInfo {
    pub bet_mode: String,
    pub fences: Vec<FenceJson>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DressJson {
    pub fence: String,
    pub scale_factor: String,
    pub identity_condition_force: Option<String>, // Dynamic value (can be a string or an array)
    pub identity_condition_win_range: Option<[f64; 2]>, // Optional field (can be a range of numbers or null)
    pub prob: Option<f64>,                              // Optional field (can be a number or null)
}

#[derive(Debug, Deserialize, Serialize)]
pub struct DressesInfo {
    pub bet_mode: String,
    pub dresses: Vec<DressJson>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ConfigData {
    pub game_id: String,
    pub bet_modes: Vec<BetMode>,
    pub fences: Vec<FencesInfo>,
    pub dresses: Vec<DressesInfo>,
}

// LOOK UP TABLE STRUCT
#[derive(Debug, Deserialize)]
pub(crate) struct LookUpTableEntry {
    pub id: u32,
    pub weight: u64,
    pub win: f64,
}

//Integer payout values
#[derive(Debug, Deserialize)]
pub(crate) struct LookUpTableInput {
    pub id: u32,
    pub weight: u64,
    pub win: u64,
}

////////////////////////////////////
/// FUNCTIONS TO LOAD CONFIG FILES
////////////////////////////////////

pub(crate) fn load_force_options(
    game_name: &str,
    bet_type: &str,
    user_game_build_path: String,
) -> Vec<SearchResult> {
    let file_path = Path::new(&user_game_build_path)
        .join(format!("force_record_{}.json", bet_type));
    let json_file_path = Path::new(&file_path);
    let file = File::open(json_file_path).expect("Unable to open force file");
    println!("json force path: {}", json_file_path.display());
    let search_results: Vec<SearchResult> =
        serde_json::from_reader(file).expect("error while reading or parsing");
    return search_results;
}

pub(crate) fn load_config_data(game_name: &str, user_game_build_path: String) -> ConfigData {
    let file_path = Path::new(&user_game_build_path)
        .join("math_config.json");
    let json_file_path = Path::new(&file_path);
    let file = File::open(json_file_path).expect("Unable to open force file");
    let config_data: ConfigData =
        serde_json::from_reader(file).expect("error while reading or parsing");
    return config_data;
}

pub(crate) fn read_look_up_table(
    game_name: &str,
    bet_type: &str,
    user_game_build_path: String,
) -> Result<HashMap<u32, LookUpTableEntry>, Box<dyn Error>> {
    let file_path = Path::new(&user_game_build_path)
        .join(format!("lookUpTable_{}.csv", bet_type));
    let csv_file_path = Path::new(&file_path);
    let file = File::open(csv_file_path)?;
    let mut rdr = ReaderBuilder::new().has_headers(false).from_reader(file);

    let mut lookup_table: HashMap<u32, LookUpTableEntry> = HashMap::new();

    for result in rdr.deserialize() {
        let record: LookUpTableInput = result?;
        let record_float = LookUpTableEntry{
            id: record.id, 
            weight: record.weight, 
            win: record.win as f64 / 100.0};
        lookup_table.insert(record.id, record_float);
    }

    Ok(lookup_table)
}