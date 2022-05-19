const axios = require("axios");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider("https://api.avax.network/ext/bc/C/rpc"));

const pefiABI = require("../abis/pefiABI.json");
const pefiMasterChef = "0x256040dc7b3cecf73a759634fc68aa60ea0d68cb";

const tokenPair = "0xb8f66a8b3a1640492e3d45a26256c8ef4b934fe6";

//--------------------------------------------------

const snowballContracts = [
    "0x44110d64b56ce8e5c39c7fb12948c915b1521762", //avax-acre
    "0xdc5fc3178d5f140206530c7e817144b90f1a8eec", //avax-ampl
    "0x7508de4f00a397a107e9c8e9c0f6fa848a328e07", //avax-avxt
    "0xdb6dd4ba6d7d691f6aee2c18937ede2661c1a6c5", //avax-bava
    "0x394b8864cfedf4af0234da34bec87502f849c369", //avax-bnb
    "0x08434e42f02a3de0e528fd0f0e16e46f9d6d2cdb", //avax-bribe
    "0xfc4c187b5b2379403d50561a577a45f8758586ba", //avax-cly
    "0x82491550daa8365ac4a5121e143d1759f4d5aded", //avax-cra
    "0x972ce57943ec6e556d46d1bbf2182e74beee247a", //avax-dai.e
    "0x5a61530deb770c3bd505eb7fea0e9cc778df9543", //avax-dcau
    "0x575fccca4acfbebfe007ba42ab83d0c0766cfbdd", //avax-dep
    "0x68faf4dd1566062abf0a21a8aeaf3a9658c0b659", //avax-dyp
    "0x8b3fb9f70ce637409e4d4d9238beb76d6a661e2b", //avax-feed
    "0xb5c8df57f60eedfee614c2daa3db28bbb8465b20", //avax-fire
    "0x2ba0fa57188a0d8ff1271b18fcc088658173578f", //avax-frax
    "0x08f49bb40ae8b988fb507ac10aea55487fa73ef9", //avax-gohm
    "0xfaca0f15887695411238c520219926a230bd364e", //avax-ime
    "0x8df22f5df3be78b69ab28d28fdd7649a9a7d6f07", //avax-jewel
    "0xb897e1b11e2a84d75932d68bc7c638544292160f", //avax-joe
    "0x043ae05b10bdbf14ce53f0519e7ff985d83ebcad", //avax-klo
    "0xfbba29dfa336a93a2a7bd1d9e82496f91d109005", //avax-link.e
    "0xd2272c864cccefbd40937e7611e8082e2fe0f273", //avax-loot
    "0x024cc2272738bba1f45289ab52485e8b46155c66", //avax-luna
    "0x6caae95c36464509c73195b2c726ff7115bae8ec", //avax-maxi
    "0x23abc50f401589dc8295cf49f3226107efab8b03", //avax-mim
    "0xc819b69f92dbafc5afb4ae9f01d825c7c9dd1290", //avax-money
    "0xc59748579367a9c7c1c0edaead7f8dad74be7083", //avax-oddz
    "0xabda973019b4038dca46a75ba4ac6066fdf2e45f", //avax-pefi
    "0xd8d665fbafb87a1baf80cd7d72171cb664de12c4", //avax-png
    "0x0e2a701e6bd06c8c5b00f37b03689a42e251de1b", //avax-qi
    "0x765fbb8be0eb3434c0aac07c9b3bf02db4bced3e", //avax-roco
    "0xb5e785d1e349e1de6c03701b88980eb8430e1447", //avax-savax
    "0x0bcf9dca633dce9a519bf809535beb60900d3b24", //avax-snob
    "0x93147a33cd2faa75f201db7a9f13abd7be7f1f9d", //avax-spell
    "0x2eb7b6d232c0446ec5424296e7f3e424b55514d5", //avax-time
    "0x776e12e282dd3685705265ff384e81b12d16d592", //avax-tus
    "0x88569a232c84b3dda282bfcf2bdc88e5143e8060", //avax-usdc.e
    "0x721e9945a95242c48cff85f6336ea8210172cc05", //avax-usdt.e
    "0x7118946c7786e7503d9b0ecf49585637a3dbd34b", //avax-ust
    "0x142f27396416f9ba4592f757d64fdb128a853ce1", //avax-ust
    "0xec650443e4818cb6e7cadb75377cfd08a060b560", //avax-wbtc.e
    "0xe1ba5e7feb54e50d02985a6781817e04efe44643", //avax-weth.e
    "0x40a3ccd8fdd23dbb41d004873811c4effaa4c924", //avax-xava
    "0xe6020e41a65d1b4fe1650f767e1062a110aa25da", //avax-yak
    "0xb5304d050c5904aa71cebed89a1d5b9b5849cac6", //avax-yay
    "0x1c7359725e2ead20fefc71121e1a96451f66f829", //avax-ydr
    "0xa0f8e092f7dfb7f78e04e8bda651d2f92f01500f", //avax-zee
    "0x394d7cd603ad37154d39b898e387d0f8e71655d6", //dlaunch-ust
    "0x335e0f76693664b122702119fbfc58b768579630", //mim-usdc.e
    "0x072507dbff9c2ba6e591ba7e533fe804d931dc37", //png-usdc.e
    "0xb6f159bd14fc33eecc39c9ef5049ca9f85d5e289", //png-ust
    "0xda8a1b7b2c249f4284a8caf7edc2271b31cd15d7", //usdc.e-dai.e
    "0x0b1442d9fc9fc48dd2af11321f20c4f6a55cd240", //usdc.e-usdt.e
    "0xb068cbb432ef18618414cb84ec5cd74a2bc77da3", //ust-usdc
    "0x8e8d14f0db2beb74016c216930887157c13ba7e9", //ust-usdc
];

const yieldyakContracts = [
    "0x9e5d0e209a55de88b890d7db9f427a066144a7c4", //savax-avax
    "0x519756fdd1f9a506afb5c3af6d34e131c8d06c5e", //axlust-usdc
    "0x77b15cf785f7a3bf8952bb37cab1d6b7ba69e232", //ust-usdc
    "0xc2e683f04f1304ca71263a0d324bbf78aa632a9a", //axlust-avax
    "0xcb3ce54f941f0c5e146a9d7164b14a3e9642658e", //ust-avax
    "0xf72a7728627ff5caa6080532228a418b27b21aab", //avax-png
    "0x205504839513d6410f85b9f8c5b29cad10fc34a3", //cra-avax
    "0x8baec13682c722069f693de435743a82e5a6d62e", //luna-avax
    "0x01435466f844fa957b48c41ea1d429b9bfabd97d", //yak-avax
    "0x1a30141051258abd414854c31eab0a2d0a658cb0", //wbtc.e-avax
    "0x969bc610c2237b2131595c1ed0e96233fc5e1832", //xava-avax
    "0xfcd2050e213cc54db2c9c99632ac870574fbc261", //weth.e-avax
    "0xd416b63b644a12a42dedf1ab28b30255601a6b2a", //tus-avax
    "0x942f08674169fbb4373b42025377dd9a4bdabe47", //spell-avax
    "0x9d681f2cfb3af3279b040069ba08f526f5334a8e", //feed-avax
];

async function findPefiWallet() {
    const pefiContract = new web3.eth.Contract(pefiABI, pefiMasterChef);
    count = 0;
    var contractsArray = [];

    try {
        while (true) {
            var pair = await pefiContract.methods.poolInfo(count).call();
            if (pair["poolToken"].toLowerCase() == tokenPair.toLowerCase()) {
                return pair["strategy"].toLowerCase();
            }

            count += 1;
        } 
    } catch (err) {
    }
}


async function main() {

    const { data: { data: { liquidityPositions } } } = await axios({
        url: "https://api.thegraph.com/subgraphs/name/pangolindex/exchange",
        method: "post",
        data: {
            query: `query {
                liquidityPositions(
                    first: 100
                    where: {
                        pair: "${tokenPair.toLowerCase()}"
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

    const positions = [];
    const pefiContracts = await findPefiWallet();
    console.log(pefiContracts);
    const TWO_DECIMAL_LOCALE = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

    console.log(`Identified pair: ${liquidityPositions[0].pair.token0.symbol}-${liquidityPositions[0].pair.token1.symbol}`);
    console.log(`Identified pair TVL: $${parseFloat(liquidityPositions[0].pair.reserveUSD).toLocaleString(undefined, TWO_DECIMAL_LOCALE)}`);

    for (const position of liquidityPositions) {
        if (parseFloat(position.liquidityTokenBalance) === 0) continue;
        if (parseFloat(position.pair.totalSupply) === 0) continue;
        if (parseFloat(position.pair.reserveUSD) === 0) continue;

        const percentOwnership = parseFloat(position.liquidityTokenBalance) / parseFloat(position.pair.totalSupply);

        const isContract = await web3.eth.getCode(position.user.id);
        const wallet = ((isContract == "0x") ? "Wallet" : "Contract");
        var compounder = "N/A";

        if (wallet == "Contract") {
            if (pefiContracts == position.user.id) {
            compounder = "PeFi";
            } else if (snowballContracts.includes(position.user.id)) {
            compounder = "Snowball";
            } else if (yieldyakContracts.includes(position.user.id)) {
            compounder = "YieldYak";
            } else {
            compounder = "-";
            }
        }

        if (percentOwnership > 0.001) {
            positions.push({
                owner: position.user.id,
                wallet: wallet,
                compounder: compounder,
                // ownerLink: `https://snowtrace.io/address/${position.user.id}`,
                'ownership (%)': (percentOwnership * 100).toFixed(2),
                'valueUSD ($)': (percentOwnership * parseFloat(position.pair.reserveUSD)).toLocaleString(undefined, TWO_DECIMAL_LOCALE),
            });
        }
    }

    console.table(positions);
}

main();
