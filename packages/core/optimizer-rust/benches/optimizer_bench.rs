use criterion::{black_box, criterion_group, criterion_main, Criterion};

/// Benchmark for Gaussian weight calculation
/// This is the hot path in get_weights()
fn bench_gaussian_powf(c: &mut Criterion) {
    let wins: Vec<f64> = (0..100).map(|i| i as f64 * 10.0).collect();
    let amps: Vec<f64> = vec![1.0, 2.0, 3.0, 4.0, 5.0];
    let mus: Vec<f64> = vec![100.0, 200.0, 300.0, 400.0, 500.0];
    let stds: Vec<f64> = vec![50.0, 60.0, 70.0, 80.0, 90.0];

    c.bench_function("gaussian_powf (current)", |b| {
        b.iter(|| {
            let mut total = 0.0;
            for win in &wins {
                for i in 0..amps.len() {
                    let z = (win - mus[i]) / stds[i];
                    // Current implementation: uses powf
                    let weight = amps[i]
                        * (1.0
                            + 20000.0
                                * (1.0 / ((stds[i] * (2.0 * 3.14)).sqrt()))
                                * ((2.71_f64).powf(-0.5 * z.powf(2.0))));
                    total += black_box(weight);
                }
            }
            total
        })
    });

    c.bench_function("gaussian_exp (optimized)", |b| {
        b.iter(|| {
            let mut total = 0.0;
            for win in &wins {
                for i in 0..amps.len() {
                    let z = (win - mus[i]) / stds[i];
                    // Optimized: uses exp() directly
                    let weight = amps[i]
                        * (1.0
                            + 20000.0
                                * (1.0 / ((stds[i] * std::f64::consts::TAU).sqrt()))
                                * ((-0.5 * z * z).exp()));
                    total += black_box(weight);
                }
            }
            total
        })
    });
}

/// Benchmark for WeightedIndex creation (allocation hot path)
fn bench_weighted_index(c: &mut Criterion) {
    use rand::prelude::*;
    use rand_distr::WeightedIndex;

    let weights: Vec<f64> = (0..100).map(|i| (i + 1) as f64).collect();
    let trials = 100;
    let spins = 50;

    c.bench_function("weighted_index_per_trial (current)", |b| {
        b.iter(|| {
            let mut total = 0;
            for _ in 0..trials {
                let mut rng = thread_rng();
                // Current: creates WeightedIndex inside loop
                let weighted_index = WeightedIndex::new(&weights).unwrap();
                for _ in 0..spins {
                    total += black_box(weighted_index.sample(&mut rng));
                }
            }
            total
        })
    });

    c.bench_function("weighted_index_reused (optimized)", |b| {
        b.iter(|| {
            let mut total = 0;
            let mut rng = thread_rng();
            // Optimized: creates WeightedIndex once outside loop
            let weighted_index = WeightedIndex::new(&weights).unwrap();
            for _ in 0..trials {
                for _ in 0..spins {
                    total += black_box(weighted_index.sample(&mut rng));
                }
            }
            total
        })
    });
}

criterion_group!(benches, bench_gaussian_powf, bench_weighted_index);
criterion_main!(benches);
