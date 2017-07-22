var babelify = require("babelify");
var browserify = require('browserify');
var concat = require('gulp-concat');
var cssnano = require('gulp-cssnano');
var del = require('del');
var electron = require('gulp-atom-electron');
var gulp = require('gulp');
var gulpIf = require('gulp-if');
var gulpReplace = require('gulp-replace');
var gulpZip = require('gulp-zip');
var imagemin = require('gulp-imagemin');
var packageJson = require('./package.json');
var runSequence = require('run-sequence');
var source = require('vinyl-source-stream');
var streamify = require('gulp-streamify');
var symdest = require('gulp-symdest');
var uglify = require('gulp-uglify');
var vinylZip = require('gulp-vinyl-zip');

const ELECTRON_VERSION = '0.36.3';
const ELECTRON_PLATFORMS = [
    {name: 'darwin', architectures: ['x64']},
    {name: 'linux', architectures: ['ia32', 'x64']},
    {name: 'win32', architectures: ['ia32', 'x64']}
];

gulp.task('default', ['chrome']);

gulp.task('chrome', ['app', 'chromeAssets']);

gulp.task('distChrome', function () {
    runSequence('clean', ['appMinified', 'chromeAssets'], function () {
        return gulp.src('./build/**')
            .pipe(gulpZip('dimpl-chrome.zip'))
            .pipe(gulp.dest('./dist/'));
    });
});

gulp.task('distElectron', function () {
    runSequence('clean', ['appMinified', 'electronAssets'], function () {
        var platform;
        var arch;
        for (var i = 0; i < ELECTRON_PLATFORMS.length; i++) {
            platform = ELECTRON_PLATFORMS[i];
            for (var j = 0; j < platform.architectures.length; j++) {
                arch = platform.architectures[j];
                buildElectron(platform.name, arch)
            }
        }
    });
});

gulp.task('downloadElectron', function () {
    var platformName;

    for (var i = 0; i < ELECTRON_PLATFORMS.length; i++) {
        platformName = ELECTRON_PLATFORMS[i].name;
        electron.dest('tmp/electron-' + platformName, {version: ELECTRON_VERSION, platform: platformName});
    }
});

gulp.task('electron', ['app', 'electronAssets']);

gulp.task('app', function () {
    return buildApp(false);
});

gulp.task('appMinified', function () {
    return buildApp(true);
});

gulp.task('chromeAssets', ['commonAssets'], function () {
    return gulp.src('./src/{chrome.js,manifest.json}')
        .pipe(gulp.dest('./build/'));
});

gulp.task('electronAssets', ['commonAssets', 'packageJson'], function () {
    return gulp.src('./src/electron.js')
        .pipe(gulp.dest('./build/'));
});

gulp.task('packageJson', function () {
    return gulp.src(['./package.json'])
        .pipe(gulpReplace('./src/electron.js', './electron.js'))
        .pipe(gulp.dest('./build/'));
});

gulp.task('commonAssets', ['css', 'img'], function () {
    return gulp.src('./src/index.html')
        .pipe(gulp.dest('./build/'));
});

gulp.task('css', function () {
    return gulp.src('./src/assets/css/**/*.css')
        .pipe(cssnano())
        .pipe(concat('bundle.css'))
        .pipe(gulp.dest('./build/assets/css/'));
});

gulp.task('img', function () {
    return gulp.src('./src/assets/img/**')
        .pipe(imagemin())
        .pipe(gulp.dest('./build/assets/img'));
});

gulp.task('clean', function (callback) {
    return del(['./build/**'], callback);
});

function buildApp(shouldMinify) {
    return browserify('./src/app')
        .transform('babelify', {presets: ['es2015', 'react']})
        .bundle()
        .pipe(source('app.js'))
        .pipe(gulpIf(shouldMinify, streamify(uglify())))
        .pipe(gulp.dest('./build/'));
}

function buildElectron(platform, arch) {
    var filename = 'dimpl-' + platform + '-' + arch + '.zip';

    return gulp.src('build/**')
        .pipe(electron({
            version: ELECTRON_VERSION,
            platform: platform,
            arch: arch,
            darwinIcon: './resources/icon.icns',
            winIcon: './resources/icon.ico'
        }))
        .pipe(vinylZip.dest('./dist/' + filename));
}