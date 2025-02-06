# Clean artifacts
echo "Cleaning artifacts..."
npx hardhat clean

# Compile contracts
echo "Compiling contracts..."
npx hardhat compile

# Run tests
echo "Running tests..."
npx hardhat test