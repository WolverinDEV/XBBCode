const webpack = require('webpack');

const isProd = process.env.NODE_ENV === 'production';
var prodPlugins = [];

//plugins that are only used for prod builds
if (isProd) {
    console.log("Building prod version...");
    prodPlugins = [
        new webpack.optimize.UglifyJsPlugin()
    ]
}

export default {
    entry: {
        demo: "./demo/demo.tsx",
        library: "./src/"
    },
    output: {
        filename: '[name].js',
    },
    devtool: 'source-map',
    resolve: {
        extensions: ['.ts', '.tsx', "scss", ".js"],
        alias: {
            xbbcode: __dirname + "/src/"
        }
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true
                        }
                    },
                    'sass-loader',
                ],
            }
        ]
    }
};