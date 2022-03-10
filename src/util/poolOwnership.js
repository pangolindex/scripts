const axios = require('axios');


// Change These Variables
// --------------------------------------------------
const PAIR = '0xdeabb6e80141f5e557ecbdd7e9580f37d7bbc371';
// --------------------------------------------------


(async () => {
    const TWO_DECIMAL_LOCALE = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

    const { data: { data: { liquidityPositions } } } = await axios({
        url: 'https://api.thegraph.com/subgraphs/name/pangolindex/exchange',
        method: 'post',
        data: {
            query: `query {
                liquidityPositions(
                    first: 1000
                    where: {
                        pair: "${PAIR.toLowerCase()}"
                        liquidityTokenBalance_gt: 0
                    }
                    orderBy: liquidityTokenBalance
                    orderDirection: desc
                ) {
                    user {
                        id
                    }
                    pair {
                        token0 {
                            symbol
                        }
                        token1 {
                            symbol
                        }
                        reserveUSD
                        totalSupply
                    }
                    liquidityTokenBalance
                }
            }`
        }
    });

    console.log(`Identified pair: ${liquidityPositions[0].pair.token0.symbol}-${liquidityPositions[0].pair.token1.symbol}`);
    console.log(`Identified pair TVL: $${parseFloat(liquidityPositions[0].pair.reserveUSD).toLocaleString(undefined, TWO_DECIMAL_LOCALE)}`);

    const positions = [];

    for (const position of liquidityPositions) {
        if (parseFloat(position.liquidityTokenBalance) === 0) continue;
        if (parseFloat(position.pair.totalSupply) === 0) continue;
        if (parseFloat(position.pair.reserveUSD) === 0) continue;

        const percentOwnership = parseFloat(position.liquidityTokenBalance) / parseFloat(position.pair.totalSupply);

        positions.push({
            owner: position.user.id,
            // ownerLink: `https://snowtrace.io/address/${position.user.id}`,
            'ownership (%)': (percentOwnership * 100).toFixed(2),
            'valueUSD ($)': (percentOwnership * parseFloat(position.pair.reserveUSD)).toLocaleString(undefined, TWO_DECIMAL_LOCALE),
        });
    }

    console.table(positions);
})()
  .catch(console.error);

