<?php

namespace App\OpenApi;

use OpenApi\Analysers\AnalyserInterface;
use OpenApi\Analysers\AttributeAnnotationFactory;
use OpenApi\Analysers\DocBlockAnnotationFactory;
use OpenApi\Analysers\ReflectionAnalyser;
use OpenApi\Analysis;
use OpenApi\Context;
use OpenApi\Generator;

class DocBlockAwareAnalyser implements AnalyserInterface
{
    private static ?Generator $generator = null;

    public static function __set_state(array $state): self
    {
        return new self;
    }

    public function setGenerator(Generator $generator): static
    {
        self::$generator = $generator;

        return $this;
    }

    public function fromFile(string $filename, Context $context): Analysis
    {
        $analyser = new ReflectionAnalyser([
            new AttributeAnnotationFactory,
            new DocBlockAnnotationFactory,
        ]);
        if (self::$generator !== null) {
            $analyser->setGenerator(self::$generator);
        }

        return $analyser->fromFile($filename, $context);
    }
}
